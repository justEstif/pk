import path from 'node:path';
import {
	chmod, cp, mkdir,
} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {pluginSourceDir, pkHome} from '../../lib/paths.ts';
import type {HarnessContext} from '../../lib/project.ts';

/**
 * Returns the path to the global Cowork plugin directory: ~/.pk/cowork-plugin/
 *
 * The plugin is project-agnostic. Each Cowork project folder becomes its own
 * pk root at runtime via ${CLAUDE_PROJECT_DIR} — no per-project install needed.
 */
export function coworkPluginDir(home: string): string {
	return path.join(pkHome(home), 'cowork-plugin');
}

/**
 * Create or update the global Cowork plugin directory by copying from the
 * static plugin/ bundle shipped with this package.
 *
 * Plugin structure (mirroring plugin/ in the repo):
 *   ~/.pk/cowork-plugin/
 *     .claude-plugin/plugin.json   — manifest (project-agnostic)
 *     .mcp.json                    — MCP server using bin/pk launcher
 *     bin/pk                       — launcher script
 *     hooks/hooks.json             — SessionStart: bootstraps pk install if missing
 *     skills/pk/                   — pk skill (SKILL.md + references/)
 *
 * The plugin is installed once and works across all Cowork projects.
 * When the user opens a Cowork project, ${CLAUDE_PROJECT_DIR} resolves to
 * that project's folder, so knowledge is always co-located at <project>/.pk/.
 *
 * Idempotent: re-running pk init updates all files except skills/ (first-install only).
 *
 * Installation: claude --plugin-dir ~/.pk/cowork-plugin  (or Cowork UI upload)
 *
 * @param ctx  Harness context (home used for plugin dir location)
 */
export async function writeCoworkPlugin(ctx: HarnessContext): Promise<string> {
	const pluginDir = coworkPluginDir(ctx.home);
	const src = pluginSourceDir();

	await mkdir(pluginDir, {recursive: true});

	for (const entry of ['.claude-plugin', '.mcp.json', 'bin', 'hooks']) {
		const srcPath = path.join(src, entry);
		const destPath = path.join(pluginDir, entry);
		if (existsSync(srcPath)) {
			// eslint-disable-next-line no-await-in-loop
			await cp(srcPath, destPath, {recursive: true, force: true});
		}
	}

	// Ensure bin/pk is executable after copy.
	const binPk = path.join(pluginDir, 'bin', 'pk');
	if (existsSync(binPk)) {
		await chmod(binPk, 0o755);
	}

	// Skills are only written on first install — preserve any user edits.
	const skillTarget = path.join(pluginDir, 'skills', 'pk');
	const skillSrc = path.join(src, 'skills', 'pk');
	if (!existsSync(skillTarget) && existsSync(skillSrc)) {
		await mkdir(path.dirname(skillTarget), {recursive: true});
		await cp(skillSrc, skillTarget, {recursive: true});
	}

	return pluginDir;
}
