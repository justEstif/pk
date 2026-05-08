import {cpSync, existsSync, mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as p from '@clack/prompts';
import type {Command} from 'commander';
import {TYPE_DIRS} from '../lib/schema.ts';
import {listExistingProjects, pkHome, projectDir} from '../lib/paths.ts';
import {writeClaudeMd, writeAgentsMd} from './harnesses/shared.ts';
import {writeClaudeConfig, writeClaudeHook} from './harnesses/claude.ts';
import {writeCodexConfig, writeCodexHook} from './harnesses/codex.ts';
import {writeOpenCodeConfig, writeOpenCodePlugin} from './harnesses/opencode.ts';

export type Harness = 'claude' | 'codex' | 'opencode';

const HARNESSES: Array<{value: Harness; label: string; hint: string}> = [
	{hint: '.mcp.json + CLAUDE.md + forced-eval hook', label: 'Claude Code', value: 'claude'},
	{hint: '.codex/config.toml + AGENTS.md + hook', label: 'Codex', value: 'codex'},
	{hint: 'opencode.json + plugin (reads AGENTS.md/CLAUDE.md)', label: 'OpenCode', value: 'opencode'},
];

const HARNESS_VALUES = new Set<string>(HARNESSES.map(h => h.value));

const HARNESS_ACTIVATION: Record<Harness, string> = {
	claude: 'start a new Claude Code session in this project',
	codex: 'restart Codex for MCP to connect',
	opencode: 'reload OpenCode or restart the app',
};

/**
 * Build the post-init summary lines shared by interactive and non-interactive paths.
 */
function buildOutro(
	created: boolean,
	knowledgeDir: string,
	harnesses: Harness[],
	skillPaths: string[],
): string[] {
	const lines: string[] = [
		created ? `Created project: ${knowledgeDir}` : `Connected to existing project: ${knowledgeDir}`,
	];

	for (const h of harnesses) {
		lines.push(`  ${h}: configured → ${HARNESS_ACTIVATION[h]}`);
	}

	for (const sp of skillPaths) {
		lines.push(`  skill installed to ${sp}`);
	}

	lines.push(
		'',
		'MCP is ready — no env export needed.',
		'To verify: ask your agent to list its tools — pk_search should appear.',
		'',
		'For CLI commands (pk search, pk new, pk lint, …):',
		`  export PK_KNOWLEDGE_DIR="${knowledgeDir}"`,
	);

	return lines;
}

/** Parse a comma-separated harness string into a validated Harness[]. */
function parseHarnesses(raw: string): Harness[] | string {
	const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
	const invalid = parts.filter(s => !HARNESS_VALUES.has(s));
	if (invalid.length > 0) {
		return `Unknown harness: ${invalid.join(', ')}. Valid: ${[...HARNESS_VALUES].join(', ')}`;
	}

	return [...new Set(parts)] as Harness[];
}

// ─── Skill installation ───────────────────────────────────────────────────────

function skillTargetDir(harness: Harness, projectRoot: string): string {
	switch (harness) {
		case 'claude': {
			return path.join(os.homedir(), '.claude', 'skills', 'pk');
		}

		case 'opencode': {
			return path.join(projectRoot, '.agents', 'skills', 'pk');
		}

		case 'codex': {
			return path.join(os.homedir(), '.codex', 'skills', 'pk');
		}
	}
}

function skillSourceDir(): string {
	return path.resolve(import.meta.dir, '..', 'skill');
}

/** Returns the path installed to, or '' if skipped/unsupported. Idempotent. */
export function installSkill(harness: Harness, projectRoot: string): string {
	const target = skillTargetDir(harness, projectRoot);
	if (!target) {
		return '';
	}

	const src = skillSourceDir();
	if (!existsSync(src)) {
		return '';
	}

	if (existsSync(target)) {
		return target;
	}

	cpSync(src, target, {recursive: true});
	return target;
}

// ─── Project creation ─────────────────────────────────────────────────────────

export async function ensureProject(name: string): Promise<{created: boolean; knowledgeDir: string}> {
	const kDir = projectDir(name);
	const alreadyExists = existsSync(kDir);
	for (const dir of Object.values(TYPE_DIRS)) {
		mkdirSync(path.join(kDir, dir), {recursive: true});
	}

	const gi = path.join(kDir, '.gitignore');
	if (!existsSync(gi)) {
		await Bun.write(gi, '.index.db\n');
	}

	return {created: !alreadyExists, knowledgeDir: kDir};
}

// ─── Harness dispatch ─────────────────────────────────────────────────────────

type HarnessContext = {name: string; knowledgeDir: string; projectRoot: string; home: string};

async function applyHarness(harness: Harness, ctx: HarnessContext): Promise<void> {
	const {knowledgeDir, projectRoot} = ctx;
	switch (harness) {
		case 'claude': {
			await writeClaudeConfig(projectRoot, knowledgeDir);
			await writeClaudeMd(projectRoot);
			await writeClaudeHook(projectRoot);
			break;
		}

		case 'codex': {
			await writeCodexConfig(projectRoot, knowledgeDir);
			await writeAgentsMd(projectRoot);
			await writeCodexHook(projectRoot);
			break;
		}

		case 'opencode': {
			await writeOpenCodeConfig(projectRoot, knowledgeDir);
			// OpenCode reads AGENTS.md and CLAUDE.md natively
			await writeAgentsMd(projectRoot);
			await writeClaudeMd(projectRoot);
			await writeOpenCodePlugin(projectRoot);
			break;
		}
	}
}

/**
 * Apply a list of harnesses, installing skill once per unique target dir.
 * Returns the set of skill paths installed.
 */
export async function applyHarnesses(harnesses: Harness[], ctx: HarnessContext): Promise<string[]> {
	await Promise.all(harnesses.map(async h => applyHarness(h, ctx)));

	const seen = new Set<string>();
	const installed: string[] = [];
	for (const h of harnesses) {
		const skillPath = installSkill(h, ctx.projectRoot);
		if (skillPath && !seen.has(skillPath)) {
			seen.add(skillPath);
			installed.push(skillPath);
		}
	}

	return installed;
}

// ─── registerInit ─────────────────────────────────────────────────────────────

export function registerInit(program: Command): void {
	program
		.command('init [name]')
		.description('Set up a pk knowledge project and wire it to your agent harness(es)')
		.option(
			'--harness <harnesses>',
			`Comma-separated harnesses: ${HARNESSES.map(h => h.value).join(', ')}`,
		)
		.action(async (nameArg: string | undefined, opts: {harness?: string}) => {
			const projectRoot = process.cwd();
			const home = os.homedir();
			const existing = listExistingProjects();

			// ── Validate harness flag early if provided ───────────────────────
			let flagHarnesses: Harness[] | undefined;
			if (opts.harness) {
				const result = parseHarnesses(opts.harness);
				if (typeof result === 'string') {
					console.error(result);
					process.exit(1);
				}

				flagHarnesses = result;
			}

			// ── Non-interactive path: both args supplied ───────────────────────
			if (nameArg && flagHarnesses) {
				const {created, knowledgeDir} = await ensureProject(nameArg);

				// Initialize git repo for new projects
				if (created) {
					try {
						const {initRepo} = await import('../lib/git.ts');
						await initRepo(knowledgeDir);
					} catch (error) {
						console.warn(`[pk] Failed to initialize git repo: ${String(error)}`);
					}
				}

				const ctx = {
					home, knowledgeDir, name: nameArg, projectRoot,
				};
				const skillPaths = await applyHarnesses(flagHarnesses, ctx);
				console.log(buildOutro(created, knowledgeDir, flagHarnesses, skillPaths).join('\n'));
				return;
			}

			// ── Interactive path ───────────────────────────────────────────────
			p.intro('pk init');

			// Step 1: project name
			let name: string;
			if (nameArg) {
				name = nameArg;
			} else {
				const choices: Array<{value: string; label: string; hint?: string}> = [
					...existing.map(n => ({hint: pkHome() + '/' + n, label: n, value: n})),
					{label: '+ New project', value: '__new__'},
				];

				const picked = await p.select({message: 'Project', options: choices});
				if (p.isCancel(picked)) {
					p.cancel('Cancelled.');
					process.exit(0);
				}

				if (picked === '__new__') {
					const typed = await p.text({
						message: 'Project name',
						placeholder: 'my-project',
						validate(v) {
							if (!v?.trim()) {
								return 'Name is required';
							}

							if (!/^[\w.-]+$/v.test(v)) {
								return 'Use letters, numbers, hyphens, dots only';
							}
						},
					});
					if (p.isCancel(typed)) {
						p.cancel('Cancelled.');
						process.exit(0);
					}

					name = typed;
				} else {
					name = picked;
				}
			}

			// Step 2: harnesses (multiselect)
			let harnesses: Harness[];
			if (flagHarnesses) {
				harnesses = flagHarnesses;
			} else {
				const picked = await p.multiselect<Harness>({
					message: 'Harnesses (space to toggle, enter to confirm)',
					options: HARNESSES.map(h => ({hint: h.hint, label: h.label, value: h.value})),
					required: true,
				});
				if (p.isCancel(picked)) {
					p.cancel('Cancelled.');
					process.exit(0);
				}

				harnesses = picked;
			}

			// ── Apply ──────────────────────────────────────────────────────────
			const {created, knowledgeDir} = await ensureProject(name);

			// Initialize git repo for new projects
			if (created) {
				try {
					const {initRepo} = await import('../lib/git.ts');
					await initRepo(knowledgeDir);
				} catch (error) {
					console.warn(`[pk] Failed to initialize git repo: ${String(error)}`);
				}
			}

			const ctx = {
				home, knowledgeDir, name, projectRoot,
			};
			const skillPaths = await applyHarnesses(harnesses, ctx);

			p.outro(buildOutro(created, knowledgeDir, harnesses, skillPaths).join('\n'));
		});
}
