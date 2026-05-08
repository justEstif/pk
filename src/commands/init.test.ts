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
	writeCursorConfig,
	writeCursorRules,
	writeCursorHook,
	writeGeminiConfig,
	writeGeminiMd,
	writeGeminiHook,
	writeCodexConfig,
	writeCodexHook,
	writeOpenCodeConfig,
	writeOpenCodePlugin,
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
	test('returns target path for cursor when skill source exists', () => {
		const result = installSkill('cursor', tmpDir);
		if (result) {
			expect(result).toBe(path.join(tmpDir, '.agents', 'skills', 'pk'));
			expect(existsSync(result)).toBe(true);
		}
	});

	test('skips reinstall if target already exists', () => {
		const target = path.join(tmpDir, '.agents', 'skills', 'pk');
		mkdirSync(target, {recursive: true});
		const result = installSkill('cursor', tmpDir);
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
		await applyHarnesses(['claude', 'cursor'], ctx);
		expect(existsSync(path.join(tmpDir, '.mcp.json'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.cursor', 'mcp.json'))).toBe(true);
		expect(existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
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
			hooks: {UserPromptSubmit: Array<{matcher: string; hooks: Array<{type: string; command: string}>}>};
		};
		expect(settings.hooks.UserPromptSubmit.some(entry => entry.hooks.some(h => h.type === 'command' && h.command.includes('pk-eval.ts')))).toBe(true);
	});

	test('does not duplicate hook registration on re-run', async () => {
		await writeClaudeHook(tmpDir);
		await writeClaudeHook(tmpDir);
		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.claude', 'settings.json')).text()) as {
			hooks: {UserPromptSubmit: Array<{matcher: string; hooks: Array<{type: string; command: string}>}>};
		};
		expect(settings.hooks.UserPromptSubmit.length).toBe(1);
	});
});

// ─── Skill installation for new harnesses ────────────────────────────────────

describe('installSkill', () => {
	test('cursor uses .agents/skills/pk', () => {
		const result = installSkill('cursor', tmpDir);
		if (result) {
			expect(result).toBe(path.join(tmpDir, '.agents', 'skills', 'pk'));
			expect(existsSync(result)).toBe(true);
		}
	});

	test('gemini uses .agents/skills/pk', () => {
		const result = installSkill('gemini', tmpDir);
		if (result) {
			expect(result).toBe(path.join(tmpDir, '.agents', 'skills', 'pk'));
			expect(existsSync(result)).toBe(true);
		}
	});

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

// ─── Cursor (.cursor/mcp.json) ─────────────────────────────────────────────────

describe('writeCursorConfig', () => {
	test('creates .cursor/mcp.json with mcpServers.pk entry', async () => {
		await writeCursorConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = await readMcpConfig(path.join(tmpDir, '.cursor', 'mcp.json'));

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
		expect(cfg.mcpServers.pk!.args).toEqual(['mcp']);
		expect(cfg.mcpServers.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});

	test('merges with existing .cursor/mcp.json', async () => {
		const existing = {mcpServers: {other: {command: 'other', args: [], env: {}}}};
		mkdirSync(path.join(tmpDir, '.cursor'), {recursive: true});
		await Bun.write(path.join(tmpDir, '.cursor', 'mcp.json'), JSON.stringify(existing));
		await writeCursorConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = await readMcpConfig(path.join(tmpDir, '.cursor', 'mcp.json'));

		expect(cfg.mcpServers.other!.command).toBe('other');
		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
	});
});

describe('writeCursorRules', () => {
	test('creates .cursor/rules/pk.mdc with frontmatter', async () => {
		await writeCursorRules(tmpDir);
		const rulesPath = path.join(tmpDir, '.cursor', 'rules', 'pk.mdc');
		expect(existsSync(rulesPath)).toBe(true);
		const content = await Bun.file(rulesPath).text();
		expect(content).toContain('---');
		expect(content).toContain('alwaysApply: true');
		expect(content).toContain('pk_synthesize');
	});
});

describe('writeCursorHook', () => {
	test('creates pk-eval.sh hook and registers in hooks.json', async () => {
		await writeCursorHook(tmpDir);
		const hookPath = path.join(tmpDir, '.cursor', 'hooks', 'pk-eval.sh');
		expect(existsSync(hookPath)).toBe(true);
		const hook = await Bun.file(hookPath).text();
		expect(hook).toContain('#!/bin/bash');
		expect(hook).toContain('additionalContext');

		const hooks = JSON.parse(await Bun.file(path.join(tmpDir, '.cursor', 'hooks.json')).text()) as {
			hooks: {beforeSubmitPrompt: Array<{command: string}>};
		};
		expect(hooks.hooks.beforeSubmitPrompt.some(h => h.command.includes('pk-eval.sh'))).toBe(true);
	});

	test('does not duplicate hook registration', async () => {
		await writeCursorHook(tmpDir);
		await writeCursorHook(tmpDir);
		const hooks = JSON.parse(await Bun.file(path.join(tmpDir, '.cursor', 'hooks.json')).text()) as {
			hooks: {beforeSubmitPrompt: Array<{command: string}>};
		};
		expect(hooks.hooks.beforeSubmitPrompt.length).toBe(1);
	});
});

// ─── Gemini CLI (.gemini/settings.json) ───────────────────────────────────────

describe('writeGeminiConfig', () => {
	test('creates .gemini/settings.json with mcpServers.pk entry', async () => {
		await writeGeminiConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = await readMcpConfig(path.join(tmpDir, '.gemini', 'settings.json'));

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
		expect(cfg.mcpServers.pk!.args).toEqual(['mcp']);
		expect(cfg.mcpServers.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});

	test('merges with existing .gemini/settings.json', async () => {
		const existing = {mcpServers: {other: {command: 'other', args: [], env: {}}}};
		mkdirSync(path.join(tmpDir, '.gemini'), {recursive: true});
		await Bun.write(path.join(tmpDir, '.gemini', 'settings.json'), JSON.stringify(existing));
		await writeGeminiConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = await readMcpConfig(path.join(tmpDir, '.gemini', 'settings.json'));

		expect(cfg.mcpServers.other!.command).toBe('other');
		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
	});
});

describe('writeGeminiMd', () => {
	test('creates GEMINI.md with pk section', async () => {
		await writeGeminiMd(tmpDir);
		const content = await Bun.file(path.join(tmpDir, 'GEMINI.md')).text();
		expect(content).toContain('<!-- pk:start -->');
		expect(content).toContain('<!-- pk:end -->');
		expect(content).toContain('pk_synthesize');
	});

	test('replaces existing pk section without duplicating', async () => {
		await writeGeminiMd(tmpDir);
		await writeGeminiMd(tmpDir);
		const content = await Bun.file(path.join(tmpDir, 'GEMINI.md')).text();
		const count = (content.match(/<!-- pk:start -->/gv) ?? []).length;
		expect(count).toBe(1);
	});
});

describe('writeGeminiHook', () => {
	test('creates pk-eval.sh hook and registers in settings.json hooks', async () => {
		await writeGeminiHook(tmpDir);
		const hookPath = path.join(tmpDir, '.gemini', 'hooks', 'pk-eval.sh');
		expect(existsSync(hookPath)).toBe(true);
		const hook = await Bun.file(hookPath).text();
		expect(hook).toContain('#!/bin/bash');
		expect(hook).toContain('BeforeAgent');

		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.gemini', 'settings.json')).text()) as {
			hooks: {BeforeAgent: Array<{command: string}>};
		};
		expect(settings.hooks.BeforeAgent.some(h => h.command.includes('pk-eval.sh'))).toBe(true);
	});

	test('does not duplicate hook registration', async () => {
		await writeGeminiHook(tmpDir);
		await writeGeminiHook(tmpDir);
		const settings = JSON.parse(await Bun.file(path.join(tmpDir, '.gemini', 'settings.json')).text()) as {
			hooks: {BeforeAgent: Array<{command: string}>};
		};
		expect(settings.hooks.BeforeAgent.length).toBe(1);
	});
});

// ─── Codex (.codex/config.toml) ───────────────────────────────────────────────

describe('writeCodexConfig', () => {
	test('creates .codex/config.toml with [mcp_servers.pk] section', async () => {
		await writeCodexConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfgPath = path.join(tmpDir, '.codex', 'config.toml');
		expect(existsSync(cfgPath)).toBe(true);
		const content = await Bun.file(cfgPath).text();
		expect(content).toContain('[mcp_servers.pk]');
		expect(content).toContain('command =');
		expect(content).toContain('PK_KNOWLEDGE_DIR');
	});
});

describe('writeCodexHook', () => {
	test('creates pk-eval.sh hook and registers in hooks.json', async () => {
		await writeCodexHook(tmpDir);
		const hookPath = path.join(tmpDir, '.codex', 'hooks', 'pk-eval.sh');
		expect(existsSync(hookPath)).toBe(true);
		const hook = await Bun.file(hookPath).text();
		expect(hook).toContain('#!/bin/bash');

		const hooks = JSON.parse(await Bun.file(path.join(tmpDir, '.codex', 'hooks.json')).text()) as {
			hooks: {UserPromptSubmit: Array<{command: string}>};
		};
		expect(hooks.hooks.UserPromptSubmit.some(h => typeof h === 'object' && h !== null && 'command' in h && typeof h.command === 'string' && h.command.includes('pk-eval'))).toBe(true);
	});

	test('does not duplicate hook registration', async () => {
		await writeCodexHook(tmpDir);
		await writeCodexHook(tmpDir);
		const hooks = JSON.parse(await Bun.file(path.join(tmpDir, '.codex', 'hooks.json')).text()) as {
			hooks: {UserPromptSubmit: Array<Record<string, unknown>>};
		};
		const count = hooks.hooks.UserPromptSubmit.filter(h => typeof h === 'object' && h !== null && 'command' in h && typeof h.command === 'string' && h.command.includes('pk-eval')).length;
		expect(count).toBe(1);
	});
});

// ─── OpenCode (opencode.json) ─────────────────────────────────────────────────

describe('writeOpenCodeConfig', () => {
	test('creates opencode.json with mcp.pk section', async () => {
		await writeOpenCodeConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfgPath = path.join(tmpDir, 'opencode.json');
		expect(existsSync(cfgPath)).toBe(true);
		const cfg = JSON.parse(await Bun.file(cfgPath).text()) as {
			mcp: Record<string, {type: string; enabled: boolean; command: string[]; environment: Record<string, string>} | undefined>;
		};
		expect(cfg.mcp.pk).toBeDefined();
		expect(cfg.mcp.pk?.type).toBe('local');
		expect(cfg.mcp.pk?.enabled).toBe(true);
		expect(cfg.mcp.pk?.command).toEqual([resolvePkCommand(), 'mcp']);
		expect(cfg.mcp.pk?.environment.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});

	test('merges with existing opencode.json', async () => {
		const existing = {
			mcp: {
				other: {
					type: 'local', enabled: true, command: ['other'], environment: {},
				},
			},
		};
		await Bun.write(path.join(tmpDir, 'opencode.json'), JSON.stringify(existing));
		await writeOpenCodeConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = JSON.parse(await Bun.file(path.join(tmpDir, 'opencode.json')).text()) as {
			mcp: Record<string, unknown>;
		};
		expect(cfg.mcp.other).toBeDefined();
		expect(cfg.mcp.pk).toBeDefined();
	});
});

describe('writeOpenCodePlugin', () => {
	test('creates .opencode/plugins/pk-eval.ts plugin', async () => {
		await writeOpenCodePlugin(tmpDir);
		const pluginPath = path.join(tmpDir, '.opencode', 'plugins', 'pk-eval.ts');
		expect(existsSync(pluginPath)).toBe(true);
		const plugin = await Bun.file(pluginPath).text();
		expect(plugin).toContain('experimental');
		expect(plugin).toContain('chat.system.transform');
		expect(plugin).toContain('system.unshift');
	});
});
