import path from 'node:path';
import {
	chmodSync, cpSync, existsSync, mkdirSync, writeFileSync,
} from 'node:fs';
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
 *     .mcp.json                    — MCP server using bin/pk launcher
 *     bin/pk                       — launcher script; finds pk on PATH or ~/.bun/bin/pk
 *     hooks/hooks.json             — SessionStart: bootstraps pk install if missing
 *     skills/pk/                   — pk skill (SKILL.md + references/)
 *
 * The plugin is installed once and works across all Cowork projects.
 * When the user opens a Cowork project, ${CLAUDE_PROJECT_DIR} resolves to
 * that project's folder, so knowledge is always co-located at <project>/.pk/.
 *
 * Self-bootstrapping: the SessionStart hook checks whether pk is installed and
 * runs the install script if not. The user approves Cowork's permission prompt
 * once; every subsequent session the check is instant.
 *
 * Session priming: pk mcp writes ${CLAUDE_PROJECT_DIR}/.claude/rules/pk.md
 * after every mutation and at startup. Cowork reads it natively via
 * InstructionsLoaded — no separate priming call needed.
 *
 * Idempotent: re-running pk init updates all files except skills/ (first-install only).
 *
 * Installation: claude --plugin-dir ~/.pk/cowork-plugin  (or Cowork UI upload)
 *
 * @param ctx    Harness context (home used for plugin dir location)
 * @param pkBin  Absolute path to the pk binary (injectable for testing)
 */
export async function writeCoworkPlugin(ctx: HarnessContext): Promise<string> {
	const pluginDir = coworkPluginDir(ctx.home);

	// ── .claude-plugin/plugin.json ─────────────────────────────────────────────
	const manifestDir = path.join(pluginDir, '.claude-plugin');
	mkdirSync(manifestDir, {recursive: true});
	const manifest = {
		author: {name: 'justEstif'},
		description: 'pk — structured knowledge for every Cowork project',
		name: 'pk',
		version: '1.0.0',
	};
	await Bun.write(path.join(manifestDir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');

	// ── bin/pk — launcher script ───────────────────────────────────────────────
	// Uses ${CLAUDE_PLUGIN_ROOT} so the path is always correct regardless of
	// where the plugin is installed. No hardcoded absolute paths.
	const binDir = path.join(pluginDir, 'bin');
	mkdirSync(binDir, {recursive: true});
	const launcher = [
		'#!/usr/bin/env bash',
		'# pk launcher — finds the pk binary without a hardcoded path.',
		'# Checks PATH first, then Bun\'s default install location.',
		'PK=$(command -v pk 2>/dev/null || echo "")',
		'if [[ -z "$PK" ]]; then',
		'  PK="$HOME/.bun/bin/pk"',
		'fi',
		'if [[ ! -x "$PK" ]]; then',
		'  echo "pk not found. Run the installer: curl -fsSL https://justestif.github.io/pk/install.sh | bash" >&2',
		'  exit 1',
		'fi',
		'exec "$PK" "$@"',
	].join('\n') + '\n';
	writeFileSync(path.join(binDir, 'pk'), launcher);
	chmodSync(path.join(binDir, 'pk'), 0o755);

	// ── .mcp.json ──────────────────────────────────────────────────────────────
	// command uses ${CLAUDE_PLUGIN_ROOT}/bin/pk — no hardcoded user path.
	// PK_KNOWLEDGE_DIR uses ${CLAUDE_PROJECT_DIR} — resolves per project at runtime.
	const mcpConfig = {
		mcpServers: {
			pk: {
				args: ['mcp'],
				// eslint-disable-next-line no-template-curly-in-string
				command: '${CLAUDE_PLUGIN_ROOT}/bin/pk',
				// eslint-disable-next-line no-template-curly-in-string
				env: {PK_KNOWLEDGE_DIR: '${CLAUDE_PROJECT_DIR}/.pk'},
			},
		},
	};
	await Bun.write(path.join(pluginDir, '.mcp.json'), JSON.stringify(mcpConfig, null, 2) + '\n');

	// ── hooks/hooks.json — SessionStart bootstrap ──────────────────────────────
	// If pk is not installed, runs the install script. The user sees a single
	// Cowork permission prompt the first time; every subsequent session the
	// check completes in milliseconds.
	const hooksDir = path.join(pluginDir, 'hooks');
	mkdirSync(hooksDir, {recursive: true});
	const installUrl = 'https://justestif.github.io/pk/install.sh';
	const hooksConfig = {
		hooks: {
			SessionStart: [
				{
					hooks: [
						{
							command: `command -v pk >/dev/null 2>&1 || "$HOME/.bun/bin/pk" --version >/dev/null 2>&1 || curl -fsSL ${installUrl} | bash`,
							type: 'command',
						},
					],
				},
			],
		},
	};
	await Bun.write(path.join(hooksDir, 'hooks.json'), JSON.stringify(hooksConfig, null, 2) + '\n');

	// ── skills/pk/ ─────────────────────────────────────────────────────────────
	const skillTarget = path.join(pluginDir, 'skills', 'pk');
	const skillSrc = skillSourceDir();
	if (!existsSync(skillTarget) && existsSync(skillSrc)) {
		mkdirSync(path.dirname(skillTarget), {recursive: true});
		cpSync(skillSrc, skillTarget, {recursive: true});
	}

	return pluginDir;
}
