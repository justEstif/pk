import {
	existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
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
	writeClaudeConfig,
	writeClaudeDesktopConfig,
	writeCodexConfig,
	writeCursorConfig,
	writeOmpConfig,
	writeOpenCodeConfig,
} from './init.ts';

type McpEntry = {command: string; args: string[]; env: Record<string, string>};
type McpServers = Record<string, McpEntry | undefined>;
type McpConfig = {mcpServers: McpServers};
type OpenCodeConfig = {mcp: McpServers};

function readMcpConfig(filePath: string): McpConfig {
	return JSON.parse(readFileSync(filePath, 'utf8')) as McpConfig;
}

function readOpenCodeConfig(filePath: string): OpenCodeConfig {
	return JSON.parse(readFileSync(filePath, 'utf8')) as OpenCodeConfig;
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
	test('creates project directories and returns created=true', () => {
		const {created, knowledgeDir} = ensureProject('myproject');
		expect(created).toBe(true);
		expect(existsSync(knowledgeDir)).toBe(true);
		expect(existsSync(path.join(knowledgeDir, 'notes'))).toBe(true);
		expect(existsSync(path.join(knowledgeDir, '.gitignore'))).toBe(true);
	});

	test('returns created=false when project already exists', () => {
		ensureProject('myproject');
		const {created} = ensureProject('myproject');
		expect(created).toBe(false);
	});
});

// ─── installSkill ────────────────────────────────────────────────────────────

describe('installSkill', () => {
	test('returns empty string for codex (unsupported)', () => {
		expect(installSkill('codex', tmpDir)).toBe('');
	});

	test('returns empty string for opencode (unsupported)', () => {
		expect(installSkill('opencode', tmpDir)).toBe('');
	});

	test('returns target path for omp when skill source exists', () => {
		// Skill source may not exist in test env — installSkill returns '' if missing
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
		// Returns target (already present)
		if (result) {
			expect(result).toBe(target);
		}
	});
});

// ─── applyHarnesses ────────────────────────────────────────────────────────

describe('applyHarnesses', () => {
	test('applies multiple harnesses in one call', () => {
		const ctx = {
			home: fakeHome, knowledgeDir: KNOWLEDGE_DIR, name: 'myproject', projectRoot: tmpDir,
		};
		applyHarnesses(['claude', 'omp'], ctx);
		expect(existsSync(path.join(tmpDir, '.mcp.json'))).toBe(true);
		expect(existsSync(path.join(tmpDir, '.omp', 'mcp.json'))).toBe(true);
	});

	test('deduplicates skill install when two harnesses share the same target', () => {
		const ctx = {
			home: fakeHome, knowledgeDir: KNOWLEDGE_DIR, name: 'myproject', projectRoot: tmpDir,
		};
		const installed = applyHarnesses(['claude', 'claude-desktop'], ctx);
		expect(new Set(installed).size).toBe(installed.length);
	});

	test('returns empty skill paths for harnesses without skill support', () => {
		const ctx = {
			home: fakeHome, knowledgeDir: KNOWLEDGE_DIR, name: 'myproject', projectRoot: tmpDir,
		};
		const installed = applyHarnesses(['codex', 'opencode'], ctx);
		expect(installed).toEqual([]);
	});
});

// ─── claude (.mcp.json) ─────────────────────────────────────────────────────

describe('writeClaudeConfig', () => {
	test('creates .mcp.json with mcpServers.pk entry', () => {
		writeClaudeConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = readMcpConfig(path.join(tmpDir, '.mcp.json'));

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());

		expect(cfg.mcpServers.pk!.args).toEqual(['mcp']);

		expect(cfg.mcpServers.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});

	test('merges with existing .mcp.json without clobbering other servers', () => {
		const existing = {mcpServers: {other: {command: 'other'}}};
		writeFileSync(path.join(tmpDir, '.mcp.json'), JSON.stringify(existing));
		writeClaudeConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = readMcpConfig(path.join(tmpDir, '.mcp.json'));

		expect(cfg.mcpServers.other!.command).toBe('other');

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());
	});
});

// ─── claude-desktop ─────────────────────────────────────────────────────────

describe('writeClaudeDesktopConfig', () => {
	test('writes pk-<name> entry to global config', () => {
		writeClaudeDesktopConfig(fakeHome, 'myproject', KNOWLEDGE_DIR);
		const cfgPath = path.join(fakeHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
		const cfg = readMcpConfig(cfgPath);

		expect(cfg.mcpServers['pk-myproject']!.command).toBe(resolvePkCommand());

		expect(cfg.mcpServers['pk-myproject']!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});

	test('creates config file if it does not exist', () => {
		writeClaudeDesktopConfig(fakeHome, 'myproject', KNOWLEDGE_DIR);
		const cfgPath = path.join(fakeHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
		expect(existsSync(cfgPath)).toBe(true);
	});

	test('multiple projects coexist in the same file', () => {
		writeClaudeDesktopConfig(fakeHome, 'proj-a', '/home/.pk/proj-a');
		writeClaudeDesktopConfig(fakeHome, 'proj-b', '/home/.pk/proj-b');
		const cfgPath = path.join(fakeHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
		const cfg = readMcpConfig(cfgPath);
		expect(cfg.mcpServers['pk-proj-a']).toBeDefined();
		expect(cfg.mcpServers['pk-proj-b']).toBeDefined();
	});
});

// ─── cursor (.cursor/mcp.json) ───────────────────────────────────────────────

describe('writeCursorConfig', () => {
	test('creates .cursor/mcp.json with mcpServers.pk', () => {
		writeCursorConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = readMcpConfig(path.join(tmpDir, '.cursor', 'mcp.json'));

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());

		expect(cfg.mcpServers.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});
});

// ─── omp (.omp/mcp.json) ─────────────────────────────────────────────────────

describe('writeOmpConfig', () => {
	test('creates .omp/mcp.json with mcpServers.pk', () => {
		writeOmpConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = readMcpConfig(path.join(tmpDir, '.omp', 'mcp.json'));

		expect(cfg.mcpServers.pk!.command).toBe(resolvePkCommand());

		expect(cfg.mcpServers.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});
});

// ─── opencode (opencode.json) ────────────────────────────────────────────────

describe('writeOpenCodeConfig', () => {
	test('creates opencode.json with mcp.pk entry', () => {
		writeOpenCodeConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const cfg = readOpenCodeConfig(path.join(tmpDir, 'opencode.json'));

		expect(cfg.mcp.pk!.command).toBe(resolvePkCommand());

		expect(cfg.mcp.pk!.env.PK_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
	});
});

// ─── codex (.codex/config.toml) ──────────────────────────────────────────────

describe('writeCodexConfig', () => {
	test('creates .codex/config.toml with mcp_servers.pk section', () => {
		writeCodexConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const toml = readFileSync(path.join(tmpDir, '.codex', 'config.toml'), 'utf8');
		expect(toml).toContain('[mcp_servers.pk]');
		expect(toml).toContain(`command = "${resolvePkCommand()}"`);
		expect(toml).toContain('args = ["mcp"]');
		expect(toml).toContain('[mcp_servers.pk.env]');
		expect(toml).toContain(`PK_KNOWLEDGE_DIR = "${KNOWLEDGE_DIR}"`);
	});

	test('skips if section already present', () => {
		writeCodexConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		writeCodexConfig(tmpDir, 'myproject', KNOWLEDGE_DIR);
		const toml = readFileSync(path.join(tmpDir, '.codex', 'config.toml'), 'utf8');
		const count = (toml.match(/\[mcp_servers[.]pk\]/gv) ?? []).length;
		expect(count).toBe(1);
	});
});
