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
import {writeOpenCodePlugin} from './harnesses/opencode.ts';
import {writePiPlugin} from './harnesses/pi.ts';

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
});

afterEach(() => {
	rmSync(tmpDir, {recursive: true, force: true});
	if (origHome === undefined) {
		delete process.env.HOME;
	} else {
		process.env.HOME = origHome;
	}
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
	test('applies opencode and pi harnesses', async () => {
		const ctx = {
			home: fakeHome,
			knowledgeDir: path.join(tmpDir, '.pk'),
			name: 'myproject',
			projectRoot: tmpDir,
		};
		await applyHarnesses(['opencode', 'pi'], ctx);
		expect(existsSync(path.join(tmpDir, '.opencode', 'plugins', 'pk-eval.ts'))).toBe(true);
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
	test('accepts valid harness values', () => {
		const result = parseHarnesses('opencode,pi');
		expect(Array.isArray(result)).toBe(true);
	});

	test('rejects unknown harness', () => {
		const result = parseHarnesses('unknown');
		expect(typeof result).toBe('string');
		expect(result).toContain('Unknown harness');
	});
});

