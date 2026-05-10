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
import {writeAgentsMd} from './harnesses/codex.ts';
import {writeClaudeHook} from './harnesses/claude.ts';
import {writeOpenCodePlugin} from './harnesses/opencode.ts';

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
	test('applies claude and codex harnesses', async () => {
		const ctx = {
			home: fakeHome, knowledgeDir: KNOWLEDGE_DIR, name: 'myproject', projectRoot: tmpDir,
		};
		await applyHarnesses(['claude', 'codex'], ctx);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts'))).toBe(true);
		expect(existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
	});
});

// ─── initializeProject ───────────────────────────────────────────────────────

describe('initializeProject', () => {
	test('creates the project, initializes git, applies harnesses, and returns output lines', async () => {
		const result = await initializeProject({
			harnesses: ['codex'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		expect(result.created).toBe(true);
		expect(existsSync(path.join(result.knowledgeDir, '.git'))).toBe(true);
		expect(existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
		expect(result.lines).toEqual([
			`Created project: ${result.knowledgeDir}`,
			'  codex: configured → start a new Codex session in this project',
		]);
	});

	test('connects to an existing initialized project without reinitializing git', async () => {
		await initializeProject({
			harnesses: ['codex'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		const result = await initializeProject({
			harnesses: ['codex'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		expect(result.created).toBe(false);
		expect(result.lines[0]).toBe(`Connected to existing project: ${result.knowledgeDir}`);
	});
});

// ─── AGENTS.md ───────────────────────────────────────────────────────────────

describe('writeAgentsMd', () => {
	test('creates AGENTS.md with pk section', async () => {
		await writeAgentsMd(tmpDir, '/fake/knowledge-dir');
		const content = await Bun.file(path.join(tmpDir, 'AGENTS.md')).text();
		expect(content).toContain('<!-- pk:start -->');
		expect(content).toContain('<!-- pk:end -->');
		expect(content).toContain('pk synthesize --session-start');
	});

	test('replaces existing pk section without duplicating', async () => {
		await writeAgentsMd(tmpDir, '/fake/knowledge-dir');
		await writeAgentsMd(tmpDir, '/fake/knowledge-dir');
		const content = await Bun.file(path.join(tmpDir, 'AGENTS.md')).text();
		const count = (content.match(/<!-- pk:start -->/gv) ?? []).length;
		expect(count).toBe(1);
	});

	test('appends to existing AGENTS.md without clobbering existing content', async () => {
		await Bun.write(path.join(tmpDir, 'AGENTS.md'), '# My project\n\nExisting content.\n');
		await writeAgentsMd(tmpDir, '/fake/knowledge-dir');
		const content = await Bun.file(path.join(tmpDir, 'AGENTS.md')).text();
		expect(content).toContain('# My project');
		expect(content).toContain('<!-- pk:start -->');
	});
});

// ─── Claude forced-eval hook ─────────────────────────────────────────────────

describe('writeClaudeHook', () => {
	test('creates pk-eval.ts hook that calls pk prime and registers it in settings.json', async () => {
		await writeClaudeHook(tmpDir, KNOWLEDGE_DIR);
		const hookPath = path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts');
		expect(existsSync(hookPath)).toBe(true);
		const hook = await Bun.file(hookPath).text();
		expect(hook).toContain('UserPromptSubmit');
		expect(hook).toContain('prime');
		expect(hook).toContain(KNOWLEDGE_DIR);

		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {UserPromptSubmit: Array<{matcher: string; hooks: Array<{type: string; command: string}>}>};
		};
		expect(settings.hooks.UserPromptSubmit.some(entry => entry.hooks.some(h => h.type === 'command' && h.command.includes('pk-eval.ts')))).toBe(true);
	});

	test('does not duplicate hook registration on re-run', async () => {
		await writeClaudeHook(tmpDir, KNOWLEDGE_DIR);
		await writeClaudeHook(tmpDir, KNOWLEDGE_DIR);
		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {UserPromptSubmit: Array<{matcher: string; hooks: Array<{type: string; command: string}>}>};
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

	test('codex uses ~/.codex/skills/pk', () => {
		const result = installSkill('codex', tmpDir);
		if (result) {
			expect(result).toBe(path.join(fakeHome, '.codex', 'skills', 'pk'));
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
