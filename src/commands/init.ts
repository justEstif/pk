import {cpSync, existsSync, mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as p from '@clack/prompts';
import type {Command} from 'commander';
import {TYPE_DIRS} from '../lib/schema.ts';
import {listExistingProjects, pkHome, projectDir} from '../lib/paths.ts';

export type Harness = 'claude' | 'claude-desktop' | 'codex' | 'cursor' | 'omp' | 'opencode';

const HARNESSES: Array<{value: Harness; label: string; hint: string}> = [
	{hint: '.mcp.json in project root', label: 'Claude Code', value: 'claude'},
	{hint: '~/Library/…/claude_desktop_config.json', label: 'Claude Desktop', value: 'claude-desktop'},
	{hint: '.cursor/mcp.json in project root', label: 'Cursor', value: 'cursor'},
	{hint: '.omp/mcp.json in project root', label: 'Oh My Pi', value: 'omp'},
	{hint: 'opencode.json in project root', label: 'OpenCode', value: 'opencode'},
	{hint: '.codex/config.toml in project root', label: 'Codex CLI', value: 'codex'},
];

const HARNESS_VALUES = new Set<string>(HARNESSES.map(h => h.value));

const HARNESS_ACTIVATION: Record<Harness, string> = {
	claude: 'start a new Claude Code session in this project',
	'claude-desktop': 'quit and restart Claude Desktop',
	codex: 'restart the Codex CLI',
	cursor: 'reload the Cursor window (Cmd+Shift+P → Reload Window)',
	omp: 'restart your Oh My Pi session',
	opencode: 'restart opencode',
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
		lines.push(`  ${h}: MCP config written → ${HARNESS_ACTIVATION[h]}`);
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

// ─── MCP entry builders ───────────────────────────────────────────────────────

type McpEntry = {
	command: string;
	args: string[];
	env: Record<string, string>;
};

export function resolvePkCommand(): string {
	return Bun.which('pk') ?? 'pk';
}

function pkMcpEntry(knowledgeDir: string): McpEntry {
	return {
		args: ['mcp'],
		command: resolvePkCommand(),
		env: {PK_KNOWLEDGE_DIR: knowledgeDir},
	};
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
	try {
		return JSON.parse(await Bun.file(filePath).text()) as Record<string, unknown>;
	} catch {
		return {};
	}
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
	mkdirSync(path.dirname(filePath), {recursive: true});
	await Bun.write(filePath, JSON.stringify(data, null, 2) + '\n');
}

// ─── Per-harness config writers (exported for testing) ───────────────────────

export async function writeClaudeConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, '.mcp.json');
	const cfg = await readJson(cfgPath);
	const servers = (cfg.mcpServers as Record<string, unknown> | undefined) ?? {};
	servers.pk = pkMcpEntry(knowledgeDir);
	cfg.mcpServers = servers;
	await writeJson(cfgPath, cfg);
}

export async function writeClaudeDesktopConfig(homeDir: string, name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
	const cfg = await readJson(cfgPath);
	const servers = (cfg.mcpServers as Record<string, unknown> | undefined) ?? {};
	servers[`pk-${name}`] = pkMcpEntry(knowledgeDir);
	cfg.mcpServers = servers;
	await writeJson(cfgPath, cfg);
}

export async function writeCursorConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, '.cursor', 'mcp.json');
	const cfg = await readJson(cfgPath);
	const servers = (cfg.mcpServers as Record<string, unknown> | undefined) ?? {};
	servers.pk = pkMcpEntry(knowledgeDir);
	cfg.mcpServers = servers;
	await writeJson(cfgPath, cfg);
}

export async function writeOmpConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, '.omp', 'mcp.json');
	const cfg = await readJson(cfgPath);
	const servers = (cfg.mcpServers as Record<string, unknown> | undefined) ?? {};
	servers.pk = pkMcpEntry(knowledgeDir);
	cfg.mcpServers = servers;
	await writeJson(cfgPath, cfg);
}

export async function writeOpenCodeConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, 'opencode.json');
	const cfg = await readJson(cfgPath);
	const mcp = (cfg.mcp as Record<string, unknown> | undefined) ?? {};
	mcp.pk = pkMcpEntry(knowledgeDir);
	cfg.mcp = mcp;
	await writeJson(cfgPath, cfg);
}

export async function writeCodexConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, '.codex', 'config.toml');
	const toml = [
		'[mcp_servers.pk]',
		`command = "${resolvePkCommand()}"`,
		'args = ["mcp"]',
		'',
		'[mcp_servers.pk.env]',
		`PK_KNOWLEDGE_DIR = "${knowledgeDir}"`,
		'',
	].join('\n');

	mkdirSync(path.dirname(cfgPath), {recursive: true});
	if (existsSync(cfgPath)) {
		const existing = await Bun.file(cfgPath).text();
		if (existing.includes('[mcp_servers.pk]')) {
			return;
		}

		await Bun.write(cfgPath, existing.trimEnd() + '\n\n' + toml);
	} else {
		await Bun.write(cfgPath, toml);
	}
}

// ─── Skill installation ───────────────────────────────────────────────────────

function skillTargetDir(harness: Harness, projectRoot: string): string {
	switch (harness) {
		case 'claude':
		case 'claude-desktop': {
			return path.join(os.homedir(), '.claude', 'skills', 'pk');
		}

		case 'omp': {
			return path.join(projectRoot, '.agents', 'skills', 'pk');
		}

		case 'cursor': {
			return path.join(projectRoot, '.cursor', 'skills', 'pk');
		}

		case 'opencode':
		case 'codex': {
			return '';
		} // No standard skill dir
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
	} // Already installed

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

export async function applyHarness(harness: Harness, ctx: HarnessContext): Promise<void> {
	const {name, knowledgeDir, projectRoot, home} = ctx;
	switch (harness) {
		case 'claude': {
			await writeClaudeConfig(projectRoot, name, knowledgeDir);
			break;
		}

		case 'claude-desktop': {
			await writeClaudeDesktopConfig(home, name, knowledgeDir);
			break;
		}

		case 'codex': {
			await writeCodexConfig(projectRoot, name, knowledgeDir);
			break;
		}

		case 'cursor': {
			await writeCursorConfig(projectRoot, name, knowledgeDir);
			break;
		}

		case 'omp': {
			await writeOmpConfig(projectRoot, name, knowledgeDir);
			break;
		}

		case 'opencode': {
			await writeOpenCodeConfig(projectRoot, name, knowledgeDir);
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
			const ctx = {
				home, knowledgeDir, name, projectRoot,
			};
			const skillPaths = await applyHarnesses(harnesses, ctx);

			p.outro(buildOutro(created, knowledgeDir, harnesses, skillPaths).join('\n'));
		});
}
