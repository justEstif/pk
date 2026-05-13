import {existsSync, mkdirSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	afterEach, beforeEach, describe, expect, test,
} from 'bun:test';
import {
	applyHarnesses,
	ensureProject,
	initializeProject,
	installSkill, parseHarnesses,
} from '../lib/project.ts';
import {writeClaudeHook} from './harnesses/claude.ts';
import {writeOpenCodePlugin} from './harnesses/opencode.ts';
import {writePiPlugin} from './harnesses/pi.ts';
import {writeClaudeDesktopConfig} from './harnesses/claude-desktop.ts';
import {writeCodexConfig} from './harnesses/codex.ts';

let tmpDir: string;
let fakeHome: string;
let origHome: string | undefined;

beforeEach(() => {
	const base = path.join(os.tmpdir(), `pk-init-test-${Date.now()}`);
	mkdirSync(base, {recursive: true});
	tmpDir = base;
	fakeHome = path.join(base, 'home');
	mkdirSync(fakeHome, {recursive: true});
	origHome = process.env.HOME;
	process.env.HOME = fakeHome;
	// On Linux, XDG_CONFIG_HOME controls where Claude Desktop config lives.
	// Redirect it to fakeHome so harness tests don't touch the real config.
	process.env.XDG_CONFIG_HOME = path.join(fakeHome, '.config');
});

afterEach(() => {
	rmSync(tmpDir, {recursive: true, force: true});
	if (origHome === undefined) {
		delete process.env.HOME;
	} else {
		process.env.HOME = origHome;
	}

	delete process.env.XDG_CONFIG_HOME;
});

// ─── ensureProject ────────────────────────────────────────────────────────────

describe('ensureProject', () => {
	test('creates project directories at given path and returns created=true', async () => {
		const kDir = path.join(tmpDir, '.pk');
		const {created, knowledgeDir} = await ensureProject(kDir);
		expect(created).toBe(true);
		expect(knowledgeDir).toBe(kDir);
		expect(existsSync(knowledgeDir)).toBe(true);
		expect(existsSync(path.join(knowledgeDir, 'notes'))).toBe(true);
		expect(existsSync(path.join(knowledgeDir, '.gitignore'))).toBe(true);
	});

	test('returns created=false when project already exists', async () => {
		const kDir = path.join(tmpDir, '.pk');
		await ensureProject(kDir);
		const {created} = await ensureProject(kDir);
		expect(created).toBe(false);
	});
});

// ─── installSkill ────────────────────────────────────────────────────────────

describe('installSkill', () => {
	test('skips reinstall if target already exists', () => {
		const target = path.join(tmpDir, '.agents', 'skills', 'pk');
		mkdirSync(target, {recursive: true});
		const result = installSkill('opencode', tmpDir);
		if (result) {
			expect(result).toBe(target);
		}
	});
});

// ─── applyHarnesses ────────────────────────────────────────────────────────

describe('applyHarnesses', () => {
	test('applies claude and pi harnesses', async () => {
		const ctx = {
			home: fakeHome,
			knowledgeDir: path.join(tmpDir, '.pk'),
			name: 'myproject',
			projectRoot: tmpDir,
		};
		await applyHarnesses(['claude', 'pi'], ctx);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts'))).toBe(true);
	});
});

// ─── initializeProject — local mode (default) ────────────────────────────────

describe('initializeProject (local)', () => {
	test('creates .pk/ in projectRoot, writes config.json, inits git, wires harness', async () => {
		const result = await initializeProject({
			harnesses: ['pi'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		expect(result.created).toBe(true);
		expect(result.knowledgeDir).toBe(path.join(tmpDir, '.pk'));
		expect(existsSync(path.join(result.knowledgeDir, '.git'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts'))).toBe(true);

		const cfg = JSON.parse(await Bun.file(path.join(tmpDir, '.pk', 'config.json')).text()) as {knowledgeDir: string; mode: string};
		expect(cfg.knowledgeDir).toBe(result.knowledgeDir);
		expect(cfg.mode).toBe('local');

		expect(result.lines[0]).toContain('Created project');
	});

	test('re-init returns created=false and overwrites config.json', async () => {
		await initializeProject({
			harnesses: ['pi'], home: fakeHome, name: 'myproject', projectRoot: tmpDir,
		});
		const result = await initializeProject({
			harnesses: ['pi'], home: fakeHome, name: 'myproject', projectRoot: tmpDir,
		});
		expect(result.created).toBe(false);
		const cfg = JSON.parse(await Bun.file(path.join(tmpDir, '.pk', 'config.json')).text()) as {mode: string};
		expect(cfg.mode).toBe('local');
		expect(result.lines[0]).toContain('Connected to existing project');
	});

	test('adds .pk/ to project .gitignore', async () => {
		await initializeProject({
			harnesses: [], home: fakeHome, name: 'myproject', projectRoot: tmpDir,
		});
		const gi = await Bun.file(path.join(tmpDir, '.gitignore')).text();
		expect(gi).toContain('.pk/');
	});
});

// ─── initializeProject — global mode ─────────────────────────────────────────

describe('initializeProject (global)', () => {
	test('creates knowledge store at ~/.pk/<name>/, writes config.json with mode=global', async () => {
		const result = await initializeProject({
			global: true,
			harnesses: ['pi'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		expect(result.created).toBe(true);
		expect(result.knowledgeDir).toBe(path.join(fakeHome, '.pk', 'myproject'));
		expect(existsSync(path.join(result.knowledgeDir, '.git'))).toBe(true);

		const cfg = JSON.parse(await Bun.file(path.join(tmpDir, '.pk', 'config.json')).text()) as {knowledgeDir: string; mode: string};
		expect(cfg.knowledgeDir).toBe(result.knowledgeDir);
		expect(cfg.mode).toBe('global');
	});
});

// ─── Pi extension ─────────────────────────────────────────────────────────────

describe('writePiPlugin', () => {
	test('creates .pi/extensions/pk-eval.ts that calls pk prime on before_agent_start', async () => {
		await writePiPlugin(tmpDir);
		const pluginPath = path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts');
		expect(existsSync(pluginPath)).toBe(true);
		const plugin = await Bun.file(pluginPath).text();
		expect(plugin).toContain('before_agent_start');
		expect(plugin).toContain('prime');
		expect(plugin).not.toContain('PK_KNOWLEDGE_DIR');
		expect(plugin).not.toContain('tool_call');
	});
});

// ─── Claude forced-eval hook ─────────────────────────────────────────────────

describe('writeClaudeHook', () => {
	test('creates eval hook and registers UserPromptSubmit in settings.json', async () => {
		await writeClaudeHook(tmpDir);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts'))).toBe(true);

		const eval_ = await Bun.file(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts')).text();
		expect(eval_).toContain('prime');

		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: Record<string, unknown[]>;
		};
		expect(settings.hooks.UserPromptSubmit?.length).toBe(1);
		expect(settings.hooks.SessionStart).toBeUndefined();
	});

	test('does not create pk-session-start.sh', async () => {
		await writeClaudeHook(tmpDir);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-session-start.sh'))).toBe(false);
	});

	test('does not duplicate hook registration on re-run', async () => {
		await writeClaudeHook(tmpDir);
		await writeClaudeHook(tmpDir);
		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {UserPromptSubmit: unknown[]};
		};
		expect(settings.hooks.UserPromptSubmit.length).toBe(1);
	});
});

// ─── Skill installation for harnesses ─────────────────────────────────────────

describe('installSkill', () => {
	test('opencode uses .agents/skills/pk', () => {
		const result = installSkill('opencode', tmpDir);
		if (result) {
			expect(result).toBe(path.join(tmpDir, '.agents', 'skills', 'pk'));
			expect(existsSync(result)).toBe(true);
		}
	});

	test('pi uses .agents/skills/pk', () => {
		const result = installSkill('pi', tmpDir);
		if (result) {
			expect(result).toBe(path.join(tmpDir, '.agents', 'skills', 'pk'));
			expect(existsSync(result)).toBe(true);
		}
	});
});

// ─── OpenCode plugin ─────────────────────────────────────────────────────────

describe('writeOpenCodePlugin', () => {
	test('creates .opencode/plugins/pk-eval.ts that calls pk prime', async () => {
		await writeOpenCodePlugin(tmpDir);
		const pluginPath = path.join(tmpDir, '.opencode', 'plugins', 'pk-eval.ts');
		expect(existsSync(pluginPath)).toBe(true);
		const plugin = await Bun.file(pluginPath).text();
		expect(plugin).toContain('experimental.chat.system.transform');
		expect(plugin).toContain('prime');
		expect(plugin).not.toContain('PK_KNOWLEDGE_DIR');
		expect(plugin).not.toContain('shell.env');
	});
});

describe('parseHarnesses', () => {
	test('accepts all harness values including claude-desktop and codex', () => {
		const result = parseHarnesses('claude,opencode,pi,claude-desktop,codex');
		expect(Array.isArray(result)).toBe(true);
		expect(result).toContain('claude-desktop');
		expect(result).toContain('codex');
	});

	test('rejects unknown harness', () => {
		const result = parseHarnesses('unknown');
		expect(typeof result).toBe('string');
		expect(result).toContain('Unknown harness');
	});
});

// ─── Claude Desktop config writer ────────────────────────────────────────────

describe('writeClaudeDesktopConfig', () => {
	const FAKE_BIN = '/usr/local/bin/pk';

	test('creates claude_desktop_config.json with mcpServers entry', async () => {
		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'myproject'), name: 'myproject', projectRoot: tmpDir,
		};
		await writeClaudeDesktopConfig(ctx, FAKE_BIN);
		const p = process.platform === 'darwin'
			? path.join(fakeHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
			: path.join(fakeHome, '.config', 'Claude', 'claude_desktop_config.json');
		const cfg = JSON.parse(await Bun.file(p).text()) as {mcpServers: Record<string, unknown>};
		expect(cfg.mcpServers['pk-myproject']).toBeDefined();
		const entry = cfg.mcpServers['pk-myproject'] as {command: string; args: string[]; env: Record<string, string>};
		expect(entry.command).toBe(FAKE_BIN);
		expect(entry.args).toEqual(['mcp']);
		expect(entry.env.PK_KNOWLEDGE_DIR).toBe(ctx.knowledgeDir);
	});

	test('merges into existing mcpServers without overwriting other servers', async () => {
		const p = process.platform === 'darwin'
			? path.join(fakeHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
			: path.join(fakeHome, '.config', 'Claude', 'claude_desktop_config.json');
		const {mkdirSync: mk} = await import('node:fs');
		mk(path.dirname(p), {recursive: true});
		await Bun.write(p, JSON.stringify({mcpServers: {'other-server': {command: 'other', args: []}}}));

		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'myproject'), name: 'myproject', projectRoot: tmpDir,
		};
		await writeClaudeDesktopConfig(ctx, FAKE_BIN);

		const cfg = JSON.parse(await Bun.file(p).text()) as {mcpServers: Record<string, unknown>};
		expect(cfg.mcpServers['other-server']).toBeDefined();
		expect(cfg.mcpServers['pk-myproject']).toBeDefined();
	});

	test('is idempotent — re-run updates entry without duplicating', async () => {
		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'myproject'), name: 'myproject', projectRoot: tmpDir,
		};
		await writeClaudeDesktopConfig(ctx, FAKE_BIN);
		await writeClaudeDesktopConfig(ctx, FAKE_BIN);
		const p = process.platform === 'darwin'
			? path.join(fakeHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
			: path.join(fakeHome, '.config', 'Claude', 'claude_desktop_config.json');
		const cfg = JSON.parse(await Bun.file(p).text()) as {mcpServers: Record<string, unknown>};
		expect(Object.keys(cfg.mcpServers).filter(k => k === 'pk-myproject')).toHaveLength(1);
	});

	test('uses provided pkBin path verbatim — no Bun.which fallback when non-empty', async () => {
		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'myproject'), name: 'myproject', projectRoot: tmpDir,
		};
		const customBin = '/custom/path/to/pk';
		await writeClaudeDesktopConfig(ctx, customBin);
		const p = process.platform === 'darwin'
			? path.join(fakeHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
			: path.join(fakeHome, '.config', 'Claude', 'claude_desktop_config.json');
		const cfg = JSON.parse(await Bun.file(p).text()) as {mcpServers: Record<string, {command: string}>};
		expect(cfg.mcpServers['pk-myproject']?.command).toBe(customBin);
	});
});

// ─── Codex config writer ──────────────────────────────────────────────────────

describe('writeCodexConfig', () => {
	const FAKE_BIN = '/usr/local/bin/pk';

	test('creates ~/.codex/config.toml with mcp_servers entry', async () => {
		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'myproject'), name: 'myproject', projectRoot: tmpDir,
		};
		await writeCodexConfig(ctx, FAKE_BIN);
		const p = path.join(fakeHome, '.codex', 'config.toml');
		expect(existsSync(p)).toBe(true);
		const text = await Bun.file(p).text();
		expect(text).toContain('pk-myproject');
		expect(text).toContain(FAKE_BIN);
		expect(text).toContain(ctx.knowledgeDir);
	});

	test('merges without overwriting other servers', async () => {
		const {mkdirSync: mk} = await import('node:fs');
		const p = path.join(fakeHome, '.codex', 'config.toml');
		mk(path.dirname(p), {recursive: true});
		await Bun.write(p, '[mcp_servers.other-server]\ncommand = "other"\n');
		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'myproject'), name: 'myproject', projectRoot: tmpDir,
		};
		await writeCodexConfig(ctx, FAKE_BIN);
		const text = await Bun.file(p).text();
		expect(text).toContain('other-server');
		expect(text).toContain('pk-myproject');
	});

	test('is idempotent — re-run updates entry without duplicating', async () => {
		const {parse} = await import('smol-toml');
		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'myproject'), name: 'myproject', projectRoot: tmpDir,
		};
		await writeCodexConfig(ctx, FAKE_BIN);
		await writeCodexConfig(ctx, FAKE_BIN);
		const p = path.join(fakeHome, '.codex', 'config.toml');
		const cfg = parse(await Bun.file(p).text()) as {mcp_servers: Record<string, unknown>};
		expect(Object.keys(cfg.mcp_servers).filter(k => k === 'pk-myproject')).toHaveLength(1);
	});

	test('handles project name with dots correctly (no nested TOML tables)', async () => {
		const {parse} = await import('smol-toml');
		const ctx = {
			home: fakeHome, knowledgeDir: path.join(fakeHome, '.pk', 'my.project'), name: 'my.project', projectRoot: tmpDir,
		};
		await writeCodexConfig(ctx, FAKE_BIN);
		const p = path.join(fakeHome, '.codex', 'config.toml');
		const cfg = parse(await Bun.file(p).text()) as {mcp_servers: Record<string, unknown>};
		// Key must be "pk-my.project" (flat), not nested as {pk-my: {project: ...}}
		expect(cfg.mcp_servers['pk-my.project']).toBeDefined();
	});
});
