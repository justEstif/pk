import path from 'node:path';
import {cpSync, existsSync, mkdirSync} from 'node:fs';
import {skillSourceDir} from '../../lib/paths.ts';
import type {HarnessContext} from '../../lib/project.ts';

/**
 * Returns the path to the cowork plugin directory for a given project.
 * Placed alongside the knowledge dir: ~/.pk/<name>-cowork/
 */
export function coworkPluginDir(ctx: HarnessContext): string {
	return path.join(path.dirname(ctx.knowledgeDir), `${ctx.name}-cowork`);
}

/**
 * Create or update a Cowork plugin directory for this project.
 *
 * Plugin structure:
 *   <pluginDir>/
 *     .claude-plugin/plugin.json   — manifest
 *     .mcp.json                    — MCP server config
 *     skills/pk/                   — pk skill (SKILL.md + references/)
 *
 * The plugin is idempotent: re-running `pk init --harness cowork` updates
 * plugin.json and .mcp.json without touching the skills directory if it
 * already exists (preserving any local customisations).
 *
 * Installation: `claude --plugin-dir <pluginDir>` or upload via Cowork UI.
 *
 * @param ctx    Harness context (name, knowledgeDir, home)
 * @param pkBin  Absolute path to the pk binary (injectable for testing)
 */
export async function writeCoworkPlugin(ctx: HarnessContext, pkBin?: string): Promise<string> {
	const resolvedBin = pkBin ?? Bun.which('pk');
	if (!resolvedBin) {
		throw new Error('pk binary not found on PATH. Install pk globally first:\n'
			+ '  npm install -g @justestif/pk\n'
			+ '  # or: brew install justEstif/tap/pk');
	}

	const pluginDir = coworkPluginDir(ctx);
	const manifestDir = path.join(pluginDir, '.claude-plugin');
	mkdirSync(manifestDir, {recursive: true});

	// .claude-plugin/plugin.json
	const manifest = {
		author: {name: 'justEstif'},
		description: `pk knowledge base — ${ctx.name}`,
		name: `pk-${ctx.name}`,
		version: '1.0.0',
	};
	await Bun.write(path.join(manifestDir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');

	// .mcp.json — MCP server config
	const mcpConfig = {
		mcpServers: {
			pk: {
				args: ['mcp'],
				command: resolvedBin,
				env: {PK_KNOWLEDGE_DIR: ctx.knowledgeDir},
			},
		},
	};
	await Bun.write(path.join(pluginDir, '.mcp.json'), JSON.stringify(mcpConfig, null, 2) + '\n');

	// Skills/pk/ — copy skill bundle if not already present
	const skillTarget = path.join(pluginDir, 'skills', 'pk');
	const skillSrc = skillSourceDir();
	if (!existsSync(skillTarget) && existsSync(skillSrc)) {
		mkdirSync(path.dirname(skillTarget), {recursive: true});
		cpSync(skillSrc, skillTarget, {recursive: true});
	}

	return pluginDir;
}
