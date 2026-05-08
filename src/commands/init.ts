import {cpSync, existsSync, mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as p from '@clack/prompts';
import type {Command} from 'commander';
import {TYPE_DIRS} from '../lib/schema.ts';
import {listExistingProjects, pkHome, projectDir} from '../lib/paths.ts';

export type Harness = 'claude' | 'cursor' | 'gemini' | 'codex' | 'opencode';

const HARNESSES: Array<{value: Harness; label: string; hint: string}> = [
	{hint: '.mcp.json + CLAUDE.md + forced-eval hook', label: 'Claude Code', value: 'claude'},
	{hint: '.cursor/mcp.json + .cursor/rules/pk.mdc + hook', label: 'Cursor', value: 'cursor'},
	{hint: '.gemini/settings.json + GEMINI.md + hook', label: 'Gemini CLI', value: 'gemini'},
	{hint: '.codex/config.toml + AGENTS.md + hook', label: 'Codex', value: 'codex'},
	{hint: 'opencode.json + plugin (reads AGENTS.md/CLAUDE.md)', label: 'OpenCode', value: 'opencode'},
];

const HARNESS_VALUES = new Set<string>(HARNESSES.map(h => h.value));

const HARNESS_ACTIVATION: Record<Harness, string> = {
	claude: 'start a new Claude Code session in this project',
	cursor: 'restart Cursor for changes to take effect',
	gemini: 'restart your Gemini CLI session',
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

// ─── Instruction file writers ─────────────────────────────────────────────────

const PK_SECTION_START = '<!-- pk:start -->';
const PK_SECTION_END = '<!-- pk:end -->';

const PK_INSTRUCTION = `\
## pk — project knowledge

Use the pk skill and its MCP tools (pk_synthesize, pk_search, pk_read, pk_new, pk_lint) \
to manage project knowledge for this project. \
Run pk_synthesize({ sessionStart: true }) at the start of every session.`;

async function writeInstructionSection(filePath: string, content: string): Promise<void> {
	const section = `${PK_SECTION_START}\n${content}\n${PK_SECTION_END}\n`;
	let existing = '';
	try {
		existing = await Bun.file(filePath).text();
	} catch {}

	const startIdx = existing.indexOf(PK_SECTION_START);
	const endIdx = existing.indexOf(PK_SECTION_END);
	let updated: string;
	if (startIdx !== -1 && endIdx !== -1) {
		updated = existing.slice(0, startIdx) + section + existing.slice(endIdx + PK_SECTION_END.length + 1);
	} else {
		updated = existing ? existing.trimEnd() + '\n\n' + section : section;
	}

	mkdirSync(path.dirname(filePath), {recursive: true});
	await Bun.write(filePath, updated);
}

export async function writeClaudeMd(projectRoot: string): Promise<void> {
	await writeInstructionSection(path.join(projectRoot, 'CLAUDE.md'), PK_INSTRUCTION);
}

export async function writeAgentsMd(projectRoot: string): Promise<void> {
	await writeInstructionSection(path.join(projectRoot, 'AGENTS.md'), PK_INSTRUCTION);
}

// ─── Harness hook writers ─────────────────────────────────────────────────────

const FORCED_EVAL_PROMPT = 'SKILL EVALUATION REQUIRED: Before responding, explicitly decide YES or NO'
	+ ' — does this request involve project work, investigation, decisions, or knowledge capture'
	+ ' where the pk skill applies? If YES, activate the pk skill, then proceed.';

function claudeHookScript(): string {
	return `\
// pk forced-eval hook — auto-generated by pk init
async function handleUserPromptSubmit() {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: ${JSON.stringify(FORCED_EVAL_PROMPT)},
    },
    suppressOutput: true,
  }));
}

handleUserPromptSubmit().catch(() => process.exit(0));
`;
}

export async function writeClaudeHook(projectRoot: string): Promise<void> {
	const hookDir = path.join(projectRoot, '.claude', 'hooks');
	const hookPath = path.join(hookDir, 'pk-eval.ts');
	mkdirSync(hookDir, {recursive: true});
	await Bun.write(hookPath, claudeHookScript());

	const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
	const settings = await readJson(settingsPath);
	const hooks = (settings.hooks as Record<string, unknown> | undefined) ?? {};
	const ups = (hooks.UserPromptSubmit as Array<Record<string, unknown>> | undefined) ?? [];
	const hookCmd = `bun run ${hookPath}`;
	const wrappedHook = {
		matcher: '',
		hooks: [
			{
				type: 'command',
				command: hookCmd,
			},
		],
	};
	const hasPkEval = (entry: Record<string, unknown>) =>
		typeof entry === 'object'
		&& entry !== null
		&& 'hooks' in entry
		&& Array.isArray(entry.hooks)
		&& entry.hooks.some((hook: unknown) =>
			typeof hook === 'object'
			&& hook !== null
			&& 'type' in hook
			&& hook.type === 'command'
			&& 'command' in hook
			&& hook.command === hookCmd);
	if (!ups.some(hasPkEval)) {
		ups.push(wrappedHook);
	}

	if (!ups.some(hasPkEval)) {
		ups.push(wrappedHook);
	}

	hooks.UserPromptSubmit = ups;
	settings.hooks = hooks;
	await writeJson(settingsPath, settings);
}

// ─── Cursor harness ─────────────────────────────────────────────────────────────

export async function writeCursorConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, '.cursor', 'mcp.json');
	const cfg = await readJson(cfgPath);
	const servers = (cfg.mcpServers as Record<string, unknown> | undefined) ?? {};
	servers.pk = pkMcpEntry(knowledgeDir);
	cfg.mcpServers = servers;
	await writeJson(cfgPath, cfg);
}

export async function writeCursorRules(projectRoot: string): Promise<void> {
	const rulesPath = path.join(projectRoot, '.cursor', 'rules', 'pk.mdc');
	const content = `\
---
description: "pk knowledge base integration"
alwaysApply: true
---

${PK_INSTRUCTION}
`;
	mkdirSync(path.dirname(rulesPath), {recursive: true});
	await Bun.write(rulesPath, content);
}

function cursorHookScript(): string {
	return `\
#!/bin/bash
# pk forced-eval hook — auto-generated by pk init
# Exit 0 to allow, exit 2 to block

# Return the forced-eval prompt as additional context
cat <<EOF
{
  "continue": true,
  "additionalContext": ${JSON.stringify(FORCED_EVAL_PROMPT)}
}
EOF
`;
}

export async function writeCursorHook(projectRoot: string): Promise<void> {
	const hookPath = path.join(projectRoot, '.cursor', 'hooks', 'pk-eval.sh');
	mkdirSync(path.dirname(hookPath), {recursive: true});
	await Bun.write(hookPath, cursorHookScript());

	const hooksPath = path.join(projectRoot, '.cursor', 'hooks.json');
	const hooks = await readJson(hooksPath);
	const hooksObj = (hooks.hooks as Record<string, unknown> | undefined) ?? {};
	const bsp = (hooksObj.beforeSubmitPrompt as Array<Record<string, unknown>> | undefined) ?? [];
	if (!bsp.some(h => h.command === hookPath)) {
		bsp.push({command: hookPath});
	}

	hooksObj.beforeSubmitPrompt = bsp;
	hooks.hooks = hooksObj;
	await writeJson(hooksPath, hooks);
}

// ─── Gemini CLI harness ───────────────────────────────────────────────────────

export async function writeGeminiConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, '.gemini', 'settings.json');
	const cfg = await readJson(cfgPath);
	const servers = (cfg.mcpServers as Record<string, unknown> | undefined) ?? {};
	servers.pk = pkMcpEntry(knowledgeDir);
	cfg.mcpServers = servers;
	await writeJson(cfgPath, cfg);
}

export async function writeGeminiMd(projectRoot: string): Promise<void> {
	await writeInstructionSection(path.join(projectRoot, 'GEMINI.md'), PK_INSTRUCTION);
}

function geminiHookScript(): string {
	return `\
#!/bin/bash
# pk forced-eval hook — auto-generated by pk init
# Output JSON to stdout with the forced-eval prompt

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "BeforeAgent",
    "additionalContext": ${JSON.stringify(FORCED_EVAL_PROMPT)}
  }
}
EOF
`;
}

export async function writeGeminiHook(projectRoot: string): Promise<void> {
	const hookPath = path.join(projectRoot, '.gemini', 'hooks', 'pk-eval.sh');
	mkdirSync(path.dirname(hookPath), {recursive: true});
	await Bun.write(hookPath, geminiHookScript());

	const cfgPath = path.join(projectRoot, '.gemini', 'settings.json');
	const cfg = await readJson(cfgPath);
	const hooks = (cfg.hooks as Record<string, unknown> | undefined) ?? {};
	const beforeAgent = (hooks.BeforeAgent as Array<Record<string, unknown>> | undefined) ?? [];
	if (!beforeAgent.some(h => h.command === hookPath)) {
		beforeAgent.push({command: hookPath});
	}

	hooks.BeforeAgent = beforeAgent;
	cfg.hooks = hooks;
	await writeJson(cfgPath, cfg);
}

// ─── Codex harness ────────────────────────────────────────────────────────────

async function writeToml(filePath: string, content: string): Promise<void> {
	mkdirSync(path.dirname(filePath), {recursive: true});
	await Bun.write(filePath, content);
}

export async function writeCodexConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, '.codex', 'config.toml');
	const pkCmd = resolvePkCommand();
	const toml = `\
[mcp_servers.pk]
command = "${pkCmd}"
args = ["mcp"]
env = { PK_KNOWLEDGE_DIR = "${knowledgeDir}" }
`;
	await writeToml(cfgPath, toml);
}

function codexHookScript(): string {
	return `\
#!/bin/bash
# pk forced-eval hook — auto-generated by pk init
# Output JSON to stdout

cat <<EOF
{
  "continue": true,
  "suppressOutput": false
}
EOF
`;
}

export async function writeCodexHook(projectRoot: string): Promise<void> {
	const hookPath = path.join(projectRoot, '.codex', 'hooks', 'pk-eval.sh');
	mkdirSync(path.dirname(hookPath), {recursive: true});
	await Bun.write(hookPath, codexHookScript());

	const hooksPath = path.join(projectRoot, '.codex', 'hooks.json');
	const hooks = await readJson(hooksPath);
	const hooksObj = (hooks.hooks as Record<string, unknown> | undefined) ?? {};
	const ups = (hooksObj.UserPromptSubmit as Array<Record<string, unknown>> | undefined) ?? [];
	if (!ups.some(h => typeof h === 'object' && h !== null && 'command' in h && typeof h.command === 'string' && h.command.includes('pk-eval'))) {
		ups.push({command: hookPath});
	}

	hooksObj.UserPromptSubmit = ups;
	hooks.hooks = hooksObj;
	await writeJson(hooksPath, hooks);
}

// ─── OpenCode harness ─────────────────────────────────────────────────────────

export async function writeOpenCodeConfig(projectRoot: string, _name: string, knowledgeDir: string): Promise<void> {
	const cfgPath = path.join(projectRoot, 'opencode.json');
	const cfg = await readJson(cfgPath);
	const mcp = (cfg.mcp as Record<string, unknown> | undefined) ?? {};
	const pkCmd = resolvePkCommand();
	mcp.pk = {
		type: 'local',
		enabled: true,
		command: [pkCmd, 'mcp'],
		environment: {PK_KNOWLEDGE_DIR: knowledgeDir},
	};
	cfg.mcp = mcp;
	await writeJson(cfgPath, cfg);
}

function openCodePluginScript(): string {
	return `\
// pk forced-eval plugin — auto-generated by pk init
export const experimental = {
   async 'chat.system.transform'({ system }: { system: string[] }): Promise<void> {
      system.unshift(${JSON.stringify(FORCED_EVAL_PROMPT)});
   },
};
`;
}

export async function writeOpenCodePlugin(projectRoot: string): Promise<void> {
	const pluginPath = path.join(projectRoot, '.opencode', 'plugins', 'pk-eval.ts');
	mkdirSync(path.dirname(pluginPath), {recursive: true});
	await Bun.write(pluginPath, openCodePluginScript());
}

// ─── Skill installation ───────────────────────────────────────────────────────

function skillTargetDir(harness: Harness, projectRoot: string): string {
	switch (harness) {
		case 'claude': {
			return path.join(os.homedir(), '.claude', 'skills', 'pk');
		}

		case 'cursor':
		case 'gemini':
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

export async function applyHarness(harness: Harness, ctx: HarnessContext): Promise<void> {
	const {name, knowledgeDir, projectRoot} = ctx;
	switch (harness) {
		case 'claude': {
			await writeClaudeConfig(projectRoot, name, knowledgeDir);
			await writeClaudeMd(projectRoot);
			await writeClaudeHook(projectRoot);
			break;
		}

		case 'cursor': {
			await writeCursorConfig(projectRoot, name, knowledgeDir);
			await writeCursorRules(projectRoot);
			await writeCursorHook(projectRoot);
			break;
		}

		case 'gemini': {
			await writeGeminiConfig(projectRoot, name, knowledgeDir);
			await writeGeminiMd(projectRoot);
			await writeGeminiHook(projectRoot);
			break;
		}

		case 'codex': {
			await writeCodexConfig(projectRoot, name, knowledgeDir);
			await writeAgentsMd(projectRoot);
			await writeCodexHook(projectRoot);
			break;
		}

		case 'opencode': {
			await writeOpenCodeConfig(projectRoot, name, knowledgeDir);
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
