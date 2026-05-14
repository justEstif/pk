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
import {coworkPluginDir, writeCoworkPlugin} from './harnesses/cowork.ts';

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
	test('accepts all harness values including cowork', () => {
		const result = parseHarnesses('claude,opencode,pi,cowork');
		expect(Array.isArray(result)).toBe(true);
		expect(result).toContain('cowork');
	});

	test('rejects unknown harness', () => {
		const result = parseHarnesses('unknown');
		expect(typeof result).toBe('string');
		expect(result).toContain('Unknown harness');
	});
});

// ─── Cowork plugin writer ─────────────────────────────────────────────────────

describe('writeCoworkPlugin', () => {
	const FAKE_BIN = '/usr/local/bin/pk';
	const ctx = () => ({
		home: fakeHome,
		knowledgeDir: path.join(fakeHome, '.pk', 'myproject'),
		name: 'myproject',
		projectRoot: tmpDir,
	});

	test('creates plugin dir with plugin.json and .mcp.json', async () => {
		const c = ctx();
		await writeCoworkPlugin(c, FAKE_BIN);
		const pluginDir = coworkPluginDir(c);
		const manifest = JSON.parse(await Bun.file(path.join(pluginDir, '.claude-plugin', 'plugin.json')).text()) as {name: string};
		expect(manifest.name).toBe('pk-myproject');
		const mcp = JSON.parse(await Bun.file(path.join(pluginDir, '.mcp.json')).text()) as {mcpServers: Record<string, {command: string; args: string[]; env: Record<string, string>}>};
		expect(mcp.mcpServers.pk.command).toBe(FAKE_BIN);
		expect(mcp.mcpServers.pk.args).toEqual(['mcp']);
		expect(mcp.mcpServers.pk.env.PK_KNOWLEDGE_DIR).toBe(c.knowledgeDir);
	});

	test('bundles skill into skills/pk/', async () => {
		const c = ctx();
		await writeCoworkPlugin(c, FAKE_BIN);
		const pluginDir = coworkPluginDir(c);
		expect(existsSync(path.join(pluginDir, 'skills', 'pk', 'SKILL.md'))).toBe(true);
	});

	test('is idempotent — re-run updates plugin.json and .mcp.json', async () => {
		const c = ctx();
		await writeCoworkPlugin(c, FAKE_BIN);
		const altBin = '/alt/bin/pk';
		await writeCoworkPlugin(c, altBin);
		const pluginDir = coworkPluginDir(c);
		const mcp = JSON.parse(await Bun.file(path.join(pluginDir, '.mcp.json')).text()) as {mcpServers: Record<string, {command: string}>};
		expect(mcp.mcpServers.pk.command).toBe(altBin);
	});

	test('throws when pk binary not found', async () => {
		const c = ctx();
		let threw = false;
		try {
			await writeCoworkPlugin(c, '');
		} catch (error) {
			threw = true;
			expect(String(error)).toContain('pk binary not found');
		}

		expect(threw).toBe(true);
	});
});
