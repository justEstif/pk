import {
	appendFileSync, cpSync, existsSync, mkdirSync, readFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeClaudeHook} from '../commands/harnesses/claude.ts';
import {writeOpenCodePlugin} from '../commands/harnesses/opencode.ts';
import {writePiPlugin} from '../commands/harnesses/pi.ts';
import {writeClaudeDesktopConfig} from '../commands/harnesses/claude-desktop.ts';
import {writeCodexConfig} from '../commands/harnesses/codex.ts';
import {TYPE_DIRS} from './schema.ts';
import {projectDir} from './paths.ts';

export type Harness = 'claude' | 'opencode' | 'pi' | 'claude-desktop' | 'codex';

export const HARNESSES: Array<{value: Harness; label: string; hint: string}> = [
	{hint: 'UserPromptSubmit context', label: 'Claude Code', value: 'claude'},
	{hint: 'chat.system.transform plugin', label: 'OpenCode', value: 'opencode'},
	{hint: 'before_agent_start context', label: 'Pi', value: 'pi'},
	{hint: 'MCP server in claude_desktop_config.json', label: 'Claude Desktop', value: 'claude-desktop'},
	{hint: 'MCP server in ~/.codex/config.toml', label: 'Codex Desktop', value: 'codex'},
];

const HARNESS_VALUES = new Set<string>(HARNESSES.map(h => h.value));

const HARNESS_ACTIVATION: Record<Harness, string> = {
	claude: 'start a new Claude Code session in this project',
	'claude-desktop': 'restart Claude Desktop',
	codex: 'restart the Codex app',
	opencode: 'reload OpenCode or restart the app',
	pi: 'start a new Pi session in this project',
};

// ─── Project creation ─────────────────────────────────────────────────────────

export async function ensureProject(knowledgeDir: string): Promise<{created: boolean; knowledgeDir: string}> {
	const alreadyExists = existsSync(knowledgeDir);
	try {
		for (const dir of Object.values(TYPE_DIRS)) {
			mkdirSync(path.join(knowledgeDir, dir), {recursive: true});
		}

		const gi = path.join(knowledgeDir, '.gitignore');
		if (!existsSync(gi)) {
			await Bun.write(gi, '.index.db\n');
		}
	} catch (error: unknown) {
		const {code} = (error as NodeJS.ErrnoException);
		if (code === 'EACCES') {
			throw new Error(`pk requires write access to ${knowledgeDir}. Check directory permissions.`, {cause: error});
		}

		throw error;
	}

	return {created: !alreadyExists, knowledgeDir};
}

// ─── Initialization workflow ─────────────────────────────────────────────────

type InitializeProjectOptions = {
	name: string;
	harnesses: Harness[];
	projectRoot: string;
	global?: boolean;
	home?: string;
};

export type InitializeProjectResult = {
	created: boolean;
	knowledgeDir: string;
	lines: string[];
};

class GitInitializationError extends Error {
	override toString(): string {
		return this.message;
	}
}

async function ensureGitRepo(created: boolean, knowledgeDir: string): Promise<void> {
	if (!created && existsSync(path.join(knowledgeDir, '.git'))) {
		return;
	}

	try {
		const {initRepo} = await import('./git.ts');
		await initRepo(knowledgeDir);
	} catch (error) {
		throw new GitInitializationError(`[pk] Failed to initialize git repo: ${String(error)}`);
	}
}

/** Append entry to projectRoot/.gitignore if not already present. */
function ensureGitignoreEntry(projectRoot: string, entry: string): void {
	const giPath = path.join(projectRoot, '.gitignore');
	try {
		const content = existsSync(giPath) ? readFileSync(giPath, 'utf8') : '';
		const lines = content.split('\n');
		if (!lines.some(l => l.trim() === entry)) {
			appendFileSync(giPath, content.endsWith('\n') || content === '' ? `${entry}\n` : `\n${entry}\n`);
		}
	} catch {/* best-effort */}
}

export async function initializeProject(options: InitializeProjectOptions): Promise<InitializeProjectResult> {
	const isGlobal = options.global ?? false;
	const knowledgeDir = isGlobal
		? projectDir(options.name)
		: path.join(options.projectRoot, '.pk');

	const {created} = await ensureProject(knowledgeDir);
	await ensureGitRepo(created, knowledgeDir);

	// Write .pk/config.json so pk commands can find knowledgeDir without env vars
	const pkDir = path.join(options.projectRoot, '.pk');
	mkdirSync(pkDir, {recursive: true});
	await Bun.write(
		path.join(pkDir, 'config.json'),
		JSON.stringify({knowledgeDir, mode: isGlobal ? 'global' : 'local'}, null, 2) + '\n',
	);

	// Ensure .pk/ is gitignored in the project
	ensureGitignoreEntry(options.projectRoot, '.pk/');

	const ctx = {
		home: options.home ?? os.homedir(),
		knowledgeDir,
		name: options.name,
		projectRoot: options.projectRoot,
	};
	await applyHarnesses(options.harnesses, ctx);

	return {
		created,
		knowledgeDir,
		lines: buildOutro(created, knowledgeDir, options.harnesses),
	};
}

// ─── Skill installation ───────────────────────────────────────────────────────

function skillTargetDir(harness: Harness, projectRoot: string): string {
	switch (harness) {
		case 'claude': {
			return path.join(projectRoot, '.claude', 'skills', 'pk');
		}

		case 'opencode':
		case 'pi': {
			return path.join(projectRoot, '.agents', 'skills', 'pk');
		}

		// Desktop harnesses configure a global MCP server entry; they have no
		// project-local skill directory convention.
		case 'claude-desktop':
		case 'codex': {
			return '';
		}
	}
}

function skillSourceDir(): string {
	return path.resolve(import.meta.dir, '..', 'skill');
}

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

// ─── Harness dispatch ─────────────────────────────────────────────────────────

export type HarnessContext = {name: string; knowledgeDir: string; projectRoot: string; home: string};

async function applyHarness(harness: Harness, ctx: HarnessContext): Promise<void> {
	const {projectRoot} = ctx;
	switch (harness) {
		case 'claude': {
			await writeClaudeHook(projectRoot);
			break;
		}

		case 'opencode': {
			await writeOpenCodePlugin(projectRoot);
			break;
		}

		case 'pi': {
			await writePiPlugin(projectRoot);
			break;
		}

		case 'claude-desktop': {
			await writeClaudeDesktopConfig(ctx);
			break;
		}

		case 'codex': {
			await writeCodexConfig(ctx);
			break;
		}
	}
}

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

// ─── Outro / validation helpers ───────────────────────────────────────────────

function buildOutro(created: boolean, knowledgeDir: string, harnesses: Harness[]): string[] {
	const lines: string[] = [
		created ? `Created project: ${knowledgeDir}` : `Connected to existing project: ${knowledgeDir}`,
	];
	for (const h of harnesses) {
		lines.push(`  ${h}: configured → ${HARNESS_ACTIVATION[h]}`);
	}

	return lines;
}

export function parseHarnesses(raw: string): Harness[] | string {
	const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
	const invalid = parts.filter(s => !HARNESS_VALUES.has(s));
	if (invalid.length > 0) {
		return `Unknown harness: ${invalid.join(', ')}. Valid: ${[...HARNESS_VALUES].join(', ')}`;
	}

	return [...new Set(parts)] as Harness[];
}
