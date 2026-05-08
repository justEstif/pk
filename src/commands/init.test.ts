import {existsSync, mkdirSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	afterEach, beforeEach, describe, expect, test,
} from 'bun:test';
import {
	applyHarnesses,
	ensureProject,
	installSkill,
	resolvePkCommand,
	writeAgentsMd,
	writeClaudeConfig,
	writeClaudeHook,
	writeClaudeMd,
	writeOmpConfig,
	writeOmpHook,
} from './init.ts';

type McpEntry = {command: string; args: string[]; env: Record<string, string>};
type McpServers = Record<string, McpEntry | undefined>;
type McpConfig = {mcpServers: McpServers};

async function readMcpConfig(filePath: string): Promise<McpConfig> {
	return JSON.parse(await Bun.file(filePath).text()) as McpConfig;
}

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
	test('returns target path for omp when skill source exists', () => {
		const result = installSkill('omp', tmpDir);
		if (result) {
			expect(result).toBe(path.join(tmpDir, '.agents', 'skills', 'pk'));
			expect(existsSync(result)).toBe(true);
		}
	});

	test('skips reinstall if target already exists', () => {
		const target = path.join(tmpDir, '.agents', 'skills', 'pk');
		mkdirSync(target, {recursive: true});
		const result = installSkill('omp', tmpDir);
		if (result) {
			expect(result).toBe(target);
		}
	});
});

// ─── applyHarnesses ────────────────────────────────────────────────────────

describe('applyHarnesses', () => {
	test('applies both harnesses in one call', async () => {
		const ctx = {
			home: fakeHome, knowledgeDir: KNOWLEDGE_DIR, name: 'myproject', projectRoot: tmpDir,
		};
		await applyHarnesses(['claude', 'omp'], ctx);
		expect(existsSync(path.join(tmpDir, '.mcp.json'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.omp', 'mcp.json'))).toBe(true);
		expect(existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
		expect(existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
	});
});

// ─── claude (.mcp.json) ─────────────────────────────────────────────────────

describe('writeClaudeConfig', () => {
	test('creates .mcp.json with mcpServers.pk entry', async () => {
		await writeClaudeConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = await readMcpConfig(path.join(tmpDir, '.mcp.json'));

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
		expect(cfg.mcpServers.pk!.args).toEqual(['mcp']);
		expect(cfg.mcpServers.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});

	test('merges with existing .mcp.json without clobbering other servers', async () => {
		const existing = {mcpServers: {other: {command: 'other'}}};
		await Bun.write(path.join(tmpDir, '.mcp.json'), JSON.stringify(existing));
		await writeClaudeConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = await readMcpConfig(path.join(tmpDir, '.mcp.json'));

		expect(cfg.mcpServers.other!.command).toBe('other');
		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
	});
});

// ─── omp (.omp/mcp.json) ─────────────────────────────────────────────────────

describe('writeOmpConfig', () => {
	test('creates .omp/mcp.json with mcpServers.pk', async () => {
		await writeOmpConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = await readMcpConfig(path.join(tmpDir, '.omp', 'mcp.json'));

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
		expect(cfg.mcpServers.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});
});

// ─── CLAUDE.md ───────────────────────────────────────────────────────────────

describe('writeClaudeMd', () => {
	test('creates CLAUDE.md with pk section', async () => {
		await writeClaudeMd(tmpDir);
		const content = await Bun.file(path.join(tmpDir, 'CLAUDE.md')).text();
		expect(content).toContain('<!-- pk:start -->');
		expect(content).toContain('<!-- pk:end -->');
		expect(content).toContain('pk_synthesize');
	});

	test('replaces existing pk section without duplicating', async () => {
		await writeClaudeMd(tmpDir);
		await writeClaudeMd(tmpDir);
		const content = await Bun.file(path.join(tmpDir, 'CLAUDE.md')).text();
		const count = (content.match(/<!-- pk:start -->/gv) ?? []).length;
		expect(count).toBe(1);
	});

	test('appends to existing CLAUDE.md without clobbering existing content', async () => {
		await Bun.write(path.join(tmpDir, 'CLAUDE.md'), '# My project\n\nExisting content.\n');
		await writeClaudeMd(tmpDir);
		const content = await Bun.file(path.join(tmpDir, 'CLAUDE.md')).text();
		expect(content).toContain('# My project');
		expect(content).toContain('<!-- pk:start -->');
	});
});

// ─── AGENTS.md ───────────────────────────────────────────────────────────────

describe('writeAgentsMd', () => {
	test('creates AGENTS.md with pk section', async () => {
		await writeAgentsMd(tmpDir);
		const content = await Bun.file(path.join(tmpDir, 'AGENTS.md')).text();
		expect(content).toContain('<!-- pk:start -->');
		expect(content).toContain('pk_synthesize');
	});
});

// ─── Claude forced-eval hook ─────────────────────────────────────────────────

describe('writeClaudeHook', () => {
	test('creates pk-eval.ts hook and registers it in settings.json', async () => {
		await writeClaudeHook(tmpDir);
		const hookPath = path.join(tmpDir, '.claude', 'hooks', 'pk-eval.ts');
		expect(existsSync(hookPath)).toBe(true);
		const hook = await Bun.file(hookPath).text();
		expect(hook).toContain('UserPromptSubmit');
		expect(hook).toContain('additionalContext');

		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {UserPromptSubmit: Array<{command: string}>};
		};
		expect(settings.hooks.UserPromptSubmit.some(h => h.command.includes('pk-eval.ts'))).toBe(true);
	});

	test('does not duplicate hook registration on re-run', async () => {
		await writeClaudeHook(tmpDir);
		await writeClaudeHook(tmpDir);
		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {UserPromptSubmit: Array<{command: string}>};
		};
		expect(settings.hooks.UserPromptSubmit.length).toBe(1);
	});
});

// ─── OMP forced-eval hook ────────────────────────────────────────────────────

describe('writeOmpHook', () => {
	test('creates pk-eval.ts extension with forced-eval prompt', async () => {
		await writeOmpHook(tmpDir);
		const hookPath = path.join(tmpDir, '.omp', 'extensions', 'pk-eval.ts');
		expect(existsSync(hookPath)).toBe(true);
		const hook = await Bun.file(hookPath).text();
		expect(hook).toContain('before_agent_start');
		expect(hook).toContain('systemPrompt');
	});
});
