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
			home: fakeHome,
			knowledgeDir: path.join(fakeHome, '.pk', 'myproject'),
			name: 'myproject',
			projectRoot: tmpDir,
		};
		await applyHarnesses(['claude', 'pi'], ctx);
		expect(existsSync(path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts'))).toBe(true);
	});
});

// ─── initializeProject ───────────────────────────────────────────────────────

describe('initializeProject', () => {
	test('creates the project, writes .pk.json, initializes git, applies harnesses, returns output lines', async () => {
		const result = await initializeProject({
			harnesses: ['pi'],
			home: fakeHome,
			name: 'myproject',
			projectRoot: tmpDir,
		});

		expect(result.created).toBe(true);
		expect(existsSync(path.join(result.knowledgeDir, '.git'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.pi', 'extensions', 'pk-eval.ts'))).toBe(true);

		// .pk.json written to project root, not knowledge dir
		const pkJson = path.join(tmpDir, '.pk.json');
		expect(existsSync(pkJson)).toBe(true);
		const config = JSON.parse(await Bun.file(pkJson).text()) as {knowledgeDir: string};
		expect(config.knowledgeDir).toBe(result.knowledgeDir);

		expect(result.lines).toEqual([
			`Created project: ${result.knowledgeDir}`,
			'  pi: configured → start a new Pi session in this project',
		]);
	});

	test('overwrites .pk.json on re-init', async () => {
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
		const config = JSON.parse(await Bun.file(path.join(tmpDir, '.pk.json')).text()) as {knowledgeDir: string};
		expect(config.knowledgeDir).toBe(result.knowledgeDir);
		expect(result.lines[0]).toBe(`Connected to existing project: ${result.knowledgeDir}`);
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
		// No longer injects PK_KNOWLEDGE_DIR — pk finds .pk.json itself
		expect(plugin).not.toContain('PK_KNOWLEDGE_DIR');
		// No longer needs tool_call env injection
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
		// SessionStart no longer registered — pk finds .pk.json itself
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

	test('removes legacy SessionStart hook on re-init', async () => {
		// Simulate old settings.json with a SessionStart pk hook
		const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
		mkdirSync(path.join(tmpDir, '.claude'), {recursive: true});
		const legacySessionStartPath = path.join(tmpDir, '.claude', 'hooks', 'pk-session-start.sh');
		await Bun.write(settingsPath, JSON.stringify({
			hooks: {
				SessionStart: [{matcher: '', hooks: [{type: 'command', command: legacySessionStartPath}]}],
			},
		}));

		await writeClaudeHook(tmpDir);

		const settings = JSON.parse(await Bun.file(settingsPath).text()) as {
			hooks: Record<string, unknown>;
		};
		expect(settings.hooks.SessionStart).toBeUndefined();
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
		// No longer sets PK_KNOWLEDGE_DIR — pk finds .pk.json itself
		expect(plugin).not.toContain('PK_KNOWLEDGE_DIR');
		expect(plugin).not.toContain('shell.env');
	});
});
