import {
	mkdirSync, realpathSync, rmSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	afterEach, beforeEach, describe, expect, test,
} from 'bun:test';
import {
	findPkProjectConfig,
	listExistingProjects,
	pkHome,
	projectDir,
	requireKnowledgeDir,
} from './paths.ts';

function homeDir(): string {
	return process.env.HOME ?? os.homedir();
}

describe('pkHome', () => {
	test('returns ~/.pk', () => {
		expect(pkHome()).toBe(path.join(homeDir(), '.pk'));
	});
});

describe('listExistingProjects', () => {
	let fakeHome: string;
	let origHome: string | undefined;

	beforeEach(() => {
		fakeHome = path.join(os.tmpdir(), `pk-paths-test-${Date.now()}`);
		mkdirSync(path.join(fakeHome, '.pk'), {recursive: true});
		origHome = process.env.HOME;
		process.env.HOME = fakeHome;
	});

	afterEach(() => {
		rmSync(fakeHome, {recursive: true, force: true});
		if (origHome === undefined) {
			delete process.env.HOME;
		} else {
			process.env.HOME = origHome;
		}
	});

	test('returns empty array when no projects exist', () => {
		expect(listExistingProjects()).toEqual([]);
	});

	test('returns project names sorted alphabetically', () => {
		mkdirSync(path.join(fakeHome, '.pk', 'zebra'), {recursive: true});
		mkdirSync(path.join(fakeHome, '.pk', 'alpha'), {recursive: true});
		expect(listExistingProjects()).toEqual(['alpha', 'zebra']);
	});

	test('ignores files (only returns directories)', async () => {
		mkdirSync(path.join(fakeHome, '.pk', 'myproject'), {recursive: true});
		await Bun.write(path.join(fakeHome, '.pk', 'notadir.txt'), '');
		expect(listExistingProjects()).toEqual(['myproject']);
	});
});

describe('findPkProjectConfig', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = path.join(os.tmpdir(), `pk-config-test-${Date.now()}`);
		mkdirSync(tmpDir, {recursive: true});
	});

	afterEach(() => {
		rmSync(tmpDir, {recursive: true, force: true});
	});

	test('finds .pk/config.json in the start directory', () => {
		mkdirSync(path.join(tmpDir, '.pk'));
		writeFileSync(path.join(tmpDir, '.pk', 'config.json'), JSON.stringify({knowledgeDir: '/tmp/proj', mode: 'global'}));
		const result = findPkProjectConfig(tmpDir);
		expect(result?.config.knowledgeDir).toBe('/tmp/proj');
		expect(result?.config.mode).toBe('global');
		expect(result?.configDir).toBe(tmpDir);
	});

	test('finds .pk/config.json in a parent directory', () => {
		mkdirSync(path.join(tmpDir, '.pk'));
		writeFileSync(path.join(tmpDir, '.pk', 'config.json'), JSON.stringify({knowledgeDir: '/tmp/proj', mode: 'global'}));
		const child = path.join(tmpDir, 'src', 'lib');
		mkdirSync(child, {recursive: true});
		const result = findPkProjectConfig(child);
		expect(result?.config.knowledgeDir).toBe('/tmp/proj');
		expect(result?.configDir).toBe(tmpDir);
	});

	test('returns null when no .pk/config.json exists', () => {
		expect(findPkProjectConfig(tmpDir)).toBeNull();
	});

	test('returns null for malformed config', () => {
		mkdirSync(path.join(tmpDir, '.pk'));
		writeFileSync(path.join(tmpDir, '.pk', 'config.json'), 'not valid json{{{');
		expect(findPkProjectConfig(tmpDir)).toBeNull();
	});
});

describe('requireKnowledgeDir', () => {
	let tmpDir: string;
	let orig: string | undefined;
	let origCwd: string;

	beforeEach(() => {
		tmpDir = path.join(os.tmpdir(), `pk-req-test-${Date.now()}`);
		mkdirSync(tmpDir, {recursive: true});
		orig = process.env.PK_KNOWLEDGE_DIR;
		origCwd = process.cwd();
		delete process.env.PK_KNOWLEDGE_DIR;
	});

	afterEach(() => {
		process.chdir(origCwd);
		rmSync(tmpDir, {recursive: true, force: true});
		if (orig === undefined) {
			delete process.env.PK_KNOWLEDGE_DIR;
		} else {
			process.env.PK_KNOWLEDGE_DIR = orig;
		}
	});

	test('returns PK_KNOWLEDGE_DIR env var when set', () => {
		process.env.PK_KNOWLEDGE_DIR = '/tmp/myproject';
		expect(requireKnowledgeDir()).toBe('/tmp/myproject');
	});

	test('env var takes priority over .pk/config.json', () => {
		mkdirSync(path.join(tmpDir, '.pk'));
		writeFileSync(path.join(tmpDir, '.pk', 'config.json'), JSON.stringify({knowledgeDir: '/tmp/from-file', mode: 'global'}));
		process.chdir(tmpDir);
		process.env.PK_KNOWLEDGE_DIR = '/tmp/from-env';
		expect(requireKnowledgeDir()).toBe('/tmp/from-env');
	});

	test('local mode: derives knowledgeDir from configDir, ignores stored path', () => {
		mkdirSync(path.join(tmpDir, '.pk'));
		writeFileSync(path.join(tmpDir, '.pk', 'config.json'), JSON.stringify({knowledgeDir: '/stale/absolute/path', mode: 'local'}));
		process.chdir(tmpDir);
		// RealpathSync normalises /var -> /private/var on macOS
		const realTmp = realpathSync(tmpDir);
		expect(requireKnowledgeDir()).toBe(path.join(realTmp, '.pk'));
	});

	test('global mode: reads knowledgeDir verbatim from .pk/config.json in CWD', () => {
		mkdirSync(path.join(tmpDir, '.pk'));
		writeFileSync(path.join(tmpDir, '.pk', 'config.json'), JSON.stringify({knowledgeDir: '/tmp/from-file', mode: 'global'}));
		process.chdir(tmpDir);
		expect(requireKnowledgeDir()).toBe('/tmp/from-file');
	});

	test('reads .pk/config.json from parent of CWD', () => {
		mkdirSync(path.join(tmpDir, '.pk'));
		writeFileSync(path.join(tmpDir, '.pk', 'config.json'), JSON.stringify({knowledgeDir: '/tmp/from-parent', mode: 'global'}));
		const sub = path.join(tmpDir, 'src');
		mkdirSync(sub);
		process.chdir(sub);
		expect(requireKnowledgeDir()).toBe('/tmp/from-parent');
	});

	test('falls back to legacy .pk.json when .pk/config.json is absent', () => {
		writeFileSync(path.join(tmpDir, '.pk.json'), JSON.stringify({knowledgeDir: '/tmp/legacy-project'}));
		process.chdir(tmpDir);
		expect(requireKnowledgeDir()).toBe('/tmp/legacy-project');
	});

	test('throws when neither env var nor config file', () => {
		process.chdir(tmpDir);
		expect(() => requireKnowledgeDir()).toThrow('No .pk/config.json found');
	});
});

describe('projectDir', () => {
	test('returns ~/.pk/<name>', () => {
		expect(projectDir('acme')).toBe(path.join(homeDir(), '.pk', 'acme'));
	});

	test('handles names with hyphens', () => {
		expect(projectDir('my-project')).toBe(path.join(homeDir(), '.pk', 'my-project'));
	});
});
