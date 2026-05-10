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
	installSkill,
} from '../lib/project.ts';
import {writeClaudeHook} from './harnesses/claude.ts';
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

const KNOWLEDGE_DIR = '/home/test/.pk/myproject';

// ─── ensureProject ────────────────────────────────────────────────────────────

describe('ensureProject', () => {
	test('creates project directories and returns created=true', async () => {
		const {created, knowledgeDir} = await ensureProject('myproject');
		expect(created).toBe(true);
		expect(existsSync(knowledgeDir)).toBe(true);
		expect(existsSync(path.join(knowledgeDir, 'notes'))).toBe(true);
		expect(existsSync(path.join(knowledgeDir, '.gitignore'))).toBe(true);
	});

	test('returns created=false when project already exists', async () => {
		await ensureProject('myproject');
		const {created} = await ensureProject('myproject');
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
			home: fakeHome, knowledgeDir: KNOWLEDGE_DIR, name: 'myproject', projectRoot: tmpDir,
		};
		await applyHarnesses(['claude', 'pi'], ctx);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts'))).toBe(true);
	});
});

// ─── initializeProject ───────────────────────────────────────────────────────

describe('initializeProject', () => {
	test('creates the project, initializes git, applies harnesses, and returns output lines', async () => {
		const result = await initializeProject({
			harnesses: ['pi'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		expect(result.created).toBe(true);
		expect(existsSync(path.join(result.knowledgeDir, '.git'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts'))).toBe(true);
		expect(result.lines).toEqual([
			`Created project: ${result.knowledgeDir}`,
			'  pi: configured → start a new Pi session in this project',
		]);
	});

	test('connects to an existing initialized project without reinitializing git', async () => {
		await initializeProject({
			harnesses: ['pi'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		const result = await initializeProject({
			harnesses: ['pi'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		expect(result.created).toBe(false);
		expect(result.lines[0]).toBe(`Connected to existing project: ${result.knowledgeDir}`);
	});
});

// ─── Pi extension ─────────────────────────────────────────────────────────────

describe('writePiPlugin', () => {
	test('creates .pi/extensions/pk-eval.ts that calls pk prime and injects env', async () => {
		await writePiPlugin(tmpDir, KNOWLEDGE_DIR);
		const pluginPath = path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts');
		expect(existsSync(pluginPath)).toBe(true);
		const plugin = await Bun.file(pluginPath).text();
		expect(plugin).toContain('before_agent_start');
		expect(plugin).toContain('tool_call');
		expect(plugin).toContain('prime');
		expect(plugin).toContain(KNOWLEDGE_DIR);
	});
});

// ─── Claude forced-eval hook ─────────────────────────────────────────────────

describe('writeClaudeHook', () => {
	test('creates session-start and eval hooks, registers both in settings.json', async () => {
		await writeClaudeHook(tmpDir, KNOWLEDGE_DIR);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-session-start.sh'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts'))).toBe(true);

		const sessionStart = await Bun.file(path.join(tmpDir, '.claude', 'hooks', 'pk-session-start.sh')).text();
		expect(sessionStart).toContain('CLAUDE_ENV_FILE');
		expect(sessionStart).toContain(KNOWLEDGE_DIR);

		const eval_ = await Bun.file(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts')).text();
		expect(eval_).toContain('prime');

		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {SessionStart: unknown[]; UserPromptSubmit: Array<{hooks: Array<{command: string}>}>};
		};
		expect(settings.hooks.SessionStart.length).toBe(1);
		expect(settings.hooks.UserPromptSubmit.some(e => (e.hooks as Array<{command: string}>).some(h => h.command.includes('pk-eval.ts')))).toBe(true);
	});

	test('does not duplicate hook registration on re-run', async () => {
		await writeClaudeHook(tmpDir, KNOWLEDGE_DIR);
		await writeClaudeHook(tmpDir, KNOWLEDGE_DIR);
		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {SessionStart: unknown[]; UserPromptSubmit: unknown[]};
		};
		expect(settings.hooks.SessionStart.length).toBe(1);
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
	test('creates .opencode/plugins/pk-eval.ts plugin that calls pk prime', async () => {
		await writeOpenCodePlugin(tmpDir, KNOWLEDGE_DIR);
		const pluginPath = path.join(tmpDir, '.opencode', 'plugins', 'pk-eval.ts');
		expect(existsSync(pluginPath)).toBe(true);
		const plugin = await Bun.file(pluginPath).text();
		expect(plugin).toContain('experimental');
		expect(plugin).toContain('chat.system.transform');
		expect(plugin).toContain('prime');
		expect(plugin).toContain(KNOWLEDGE_DIR);
	});
});
