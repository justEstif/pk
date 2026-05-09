import {cpSync, existsSync, mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeClaudeHook} from '../commands/harnesses/claude.ts';
import {writeAgentsMd} from '../commands/harnesses/codex.ts';
import {writeOpenCodePlugin} from '../commands/harnesses/opencode.ts';
import {TYPE_DIRS} from './schema.ts';
import {projectDir} from './paths.ts';

export type Harness = 'claude' | 'codex' | 'opencode';

export const HARNESSES: Array<{value: Harness; label: string; hint: string}> = [
	{hint: 'forced-eval hook', label: 'Claude Code', value: 'claude'},
	{hint: 'AGENTS.md injection', label: 'Codex', value: 'codex'},
	{hint: 'forced-eval plugin', label: 'OpenCode', value: 'opencode'},
];

export const HARNESS_VALUES = new Set<string>(HARNESSES.map(h => h.value));

export const HARNESS_ACTIVATION: Record<Harness, string> = {
	claude: 'start a new Claude Code session in this project',
	codex: 'start a new Codex session in this project',
	opencode: 'reload OpenCode or restart the app',
};

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

// ─── Harness dispatch ─────────────────────────────────────────────────────────

export type HarnessContext = {name: string; knowledgeDir: string; projectRoot: string; home: string};

async function applyHarness(harness: Harness, ctx: HarnessContext): Promise<void> {
	const {knowledgeDir, projectRoot} = ctx;
	switch (harness) {
		case 'claude': {
			await writeClaudeHook(projectRoot, knowledgeDir);
			break;
		}

		case 'codex': {
			await writeAgentsMd(projectRoot, knowledgeDir);
			break;
		}

		case 'opencode': {
			await writeOpenCodePlugin(projectRoot, knowledgeDir);
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
export function buildOutro(
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
		'Verify: pk search --help',
		`export PK_KNOWLEDGE_DIR="${knowledgeDir}"`,
	);

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
