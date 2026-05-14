import path from 'node:path';
import {cpSync, existsSync, mkdirSync} from 'node:fs';
import {skillSourceDir, pkHome} from '../../lib/paths.ts';
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
 * Create or update the global Cowork plugin directory.
 *
 * Plugin structure:
 *   ~/.pk/cowork-plugin/
 *     .claude-plugin/plugin.json   — manifest (project-agnostic)
 *     .mcp.json                    — MCP server; PK_KNOWLEDGE_DIR=${CLAUDE_PROJECT_DIR}/.pk
 *     hooks/hooks.json             — SessionStart: prime knowledge context via mcp_tool
 *     skills/pk/                   — pk skill (SKILL.md + references/)
 *
 * The plugin is installed once and works across all Cowork projects.
 * When the user opens a Cowork project, ${CLAUDE_PROJECT_DIR} resolves to
 * that project's folder, so knowledge is always co-located at <project>/.pk/.
 *
 * Idempotent: re-running pk init updates plugin.json, .mcp.json, and hooks.json.
 * The skills directory is only written on first install.
 *
 * Installation: claude --plugin-dir ~/.pk/cowork-plugin  (or Cowork UI upload)
 *
 * @param ctx    Harness context (home used for plugin dir location)
 * @param pkBin  Absolute path to the pk binary (injectable for testing)
 */
export async function writeCoworkPlugin(ctx: HarnessContext, pkBin?: string): Promise<string> {
	const resolvedBin = pkBin ?? Bun.which('pk');
	if (!resolvedBin) {
		throw new Error('pk binary not found on PATH. Install pk globally first:\n'
			+ '  npm install -g @justestif/pk\n'
			+ '  # or: brew install justEstif/tap/pk');
	}

	const pluginDir = coworkPluginDir(ctx.home);
	const manifestDir = path.join(pluginDir, '.claude-plugin');
	mkdirSync(manifestDir, {recursive: true});

	// .claude-plugin/plugin.json — single global plugin, no project name in id
	const manifest = {
		author: {name: 'justEstif'},
		description: 'pk — structured knowledge for every Cowork project',
		name: 'pk',
		version: '1.0.0',
	};
	await Bun.write(path.join(manifestDir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');

	// .mcp.json — ${CLAUDE_PROJECT_DIR} is substituted by Cowork with the
	// current project folder path, so knowledge lives at <project>/.pk/
	const mcpConfig = {
		mcpServers: {
			pk: {
				args: ['mcp'],
				command: resolvedBin,
				// eslint-disable-next-line no-template-curly-in-string
				env: {PK_KNOWLEDGE_DIR: '${CLAUDE_PROJECT_DIR}/.pk'},
			},
		},
	};
	await Bun.write(path.join(pluginDir, '.mcp.json'), JSON.stringify(mcpConfig, null, 2) + '\n');

	// Hooks/hooks.json — at SessionStart, call pk_synthesize via the MCP tool
	// so the server (which already has PK_KNOWLEDGE_DIR set) primes context.
	const hooksDir = path.join(pluginDir, 'hooks');
	mkdirSync(hooksDir, {recursive: true});
	const hooksConfig = {
		hooks: {
			SessionStart: [
				{
					hooks: [
						{
							tool: 'pk.pk_synthesize',
							params: {sessionStart: true},
							type: 'mcp_tool',
						},
					],
				},
			],
		},
	};
	await Bun.write(path.join(hooksDir, 'hooks.json'), JSON.stringify(hooksConfig, null, 2) + '\n');

	// Skills/pk/ — copy skill bundle if not already present
	const skillTarget = path.join(pluginDir, 'skills', 'pk');
	const skillSrc = skillSourceDir();
	if (!existsSync(skillTarget) && existsSync(skillSrc)) {
		mkdirSync(path.dirname(skillTarget), {recursive: true});
		cpSync(skillSrc, skillTarget, {recursive: true});
	}

	return pluginDir;
}
