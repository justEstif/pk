import {cpSync, existsSync, mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeClaudeHook} from '../commands/harnesses/claude.ts';
import {writeOpenCodePlugin} from '../commands/harnesses/opencode.ts';
import {writePiPlugin} from '../commands/harnesses/pi.ts';
import {TYPE_DIRS} from './schema.ts';
import {projectDir} from './paths.ts';

export type Harness = 'claude' | 'opencode' | 'pi';

export const HARNESSES: Array<{value: Harness; label: string; hint: string}> = [
	{hint: 'SessionStart env + UserPromptSubmit context', label: 'Claude Code', value: 'claude'},
	{hint: 'shell.env + chat.system.transform plugin', label: 'OpenCode', value: 'opencode'},
	{hint: 'tool_call env + before_agent_start context', label: 'Pi', value: 'pi'},
];

const HARNESS_VALUES = new Set<string>(HARNESSES.map(h => h.value));

const HARNESS_ACTIVATION: Record<Harness, string> = {
	claude: 'start a new Claude Code session in this project',
	opencode: 'reload OpenCode or restart the app',
	pi: 'start a new Pi session in this project',
};

// ─── Project creation ─────────────────────────────────────────────────────────

export async function ensureProject(name: string): Promise<{created: boolean; knowledgeDir: string}> {
	const kDir = projectDir(name);
	const alreadyExists = existsSync(kDir);
	try {
		for (const dir of Object.values(TYPE_DIRS)) {
			mkdirSync(path.join(kDir, dir), {recursive: true});
		}

		const gi = path.join(kDir, '.gitignore');
		if (!existsSync(gi)) {
			await Bun.write(gi, '.index.db\n');
		}
	} catch (error: unknown) {
		const {code} = (error as NodeJS.ErrnoException);
		if (code === 'EACCES') {
			throw new Error(`pk requires write access to ${kDir}. Check directory permissions.`, {cause: error});
		}

		throw error;
	}

	return {created: !alreadyExists, knowledgeDir: kDir};
}

// ─── Initialization workflow ─────────────────────────────────────────────────

type InitializeProjectOptions = {
	name: string;
	harnesses: Harness[];
	projectRoot: string;
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

/**
 * Ensure git repo exists in the knowledge directory.
 * Runs on first creation and on re-init if .git is missing.
 */
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

/**
 * Run the shared project initialization workflow and return display lines.
 */
export async function initializeProject(options: InitializeProjectOptions): Promise<InitializeProjectResult> {
	const {created, knowledgeDir} = await ensureProject(options.name);
	await ensureGitRepo(created, knowledgeDir);

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

// ─── Harness dispatch ─────────────────────────────────────────────────────────

export type HarnessContext = {name: string; knowledgeDir: string; projectRoot: string; home: string};

async function applyHarness(harness: Harness, ctx: HarnessContext): Promise<void> {
	const {knowledgeDir, projectRoot} = ctx;
	switch (harness) {
		case 'claude': {
			await writeClaudeHook(projectRoot, knowledgeDir);
			break;
		}

		case 'opencode': {
			await writeOpenCodePlugin(projectRoot, knowledgeDir);
			break;
		}

		case 'pi': {
			await writePiPlugin(projectRoot, knowledgeDir);
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

// ─── Outro / validation helpers ───────────────────────────────────────────────

/**
 * Build the post-init summary lines shared by interactive and non-interactive paths.
 */
function buildOutro(
	created: boolean,
	knowledgeDir: string,
	harnesses: Harness[],
): string[] {
	const lines: string[] = [
		created ? `Created project: ${knowledgeDir}` : `Connected to existing project: ${knowledgeDir}`,
	];

	for (const h of harnesses) {
		lines.push(`  ${h}: configured → ${HARNESS_ACTIVATION[h]}`);
	}

	return lines;
}

/** Parse a comma-separated harness string into a validated Harness[]. */
export function parseHarnesses(raw: string): Harness[] | string {
	const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
	const invalid = parts.filter(s => !HARNESS_VALUES.has(s));
	if (invalid.length > 0) {
		return `Unknown harness: ${invalid.join(', ')}. Valid: ${[...HARNESS_VALUES].join(', ')}`;
	}

	return [...new Set(parts)] as Harness[];
}
