import {
	appendFileSync, cpSync, existsSync, mkdirSync, readFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeOpenCodePlugin} from '../commands/harnesses/opencode.ts';
import {writePiPlugin} from '../commands/harnesses/pi.ts';
import {TYPE_DIRS} from './schema.ts';
import {pkHome, projectDir, skillSourceDir} from './paths.ts';

export type Harness = 'opencode' | 'pi';

export const HARNESSES: Array<{value: Harness; label: string; hint: string}> = [
	{hint: 'chat.system.transform plugin', label: 'OpenCode', value: 'opencode'},
	{hint: 'before_agent_start context', label: 'Pi', value: 'pi'},
];

const HARNESS_VALUES = new Set<string>(HARNESSES.map(h => h.value));

const HARNESS_ACTIVATION: Record<Harness, string> = {
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

	if (isGlobal) {
		// Global mode: write currentProject to ~/.pk/config.json
		const globalConfigPath = path.join(pkHome(options.home), 'config.json');
		await Bun.write(
			globalConfigPath,
			JSON.stringify({currentProject: options.name}, null, 2) + '\n',
		);
	} else {
		// Local mode: write .pk/config.json in project root
		const pkDir = path.join(options.projectRoot, '.pk');
		mkdirSync(pkDir, {recursive: true});
		await Bun.write(
			path.join(pkDir, 'config.json'),
			JSON.stringify({knowledgeDir, mode: 'local'}, null, 2) + '\n',
		);

		// Ensure .pk/ is gitignored in the project
		ensureGitignoreEntry(options.projectRoot, '.pk/');
	}

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

function skillTargetDir(home: string): string {
	return path.join(home, '.agents', 'skills', 'pk');
}

export function installSkill(home: string): string {
	const target = skillTargetDir(home);
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
	const {home} = ctx;
	switch (harness) {
		case 'opencode': {
			await writeOpenCodePlugin(home);
			break;
		}

		case 'pi': {
			await writePiPlugin(home);
			break;
		}
	}
}

export async function applyHarnesses(harnesses: Harness[], ctx: HarnessContext): Promise<string[]> {
	await Promise.all(harnesses.map(async h => applyHarness(h, ctx)));
	const skillPath = installSkill(ctx.home);
	return skillPath ? [skillPath] : [];
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
