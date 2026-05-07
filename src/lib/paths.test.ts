import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	afterEach, beforeEach, describe, expect, test,
} from 'bun:test';
import {
	listExistingProjects, pkHome, projectDir, requireKnowledgeDir,
} from './paths.ts';

describe('pkHome', () => {
	test('returns ~/.pk', () => {
		expect(pkHome()).toBe(path.join(os.homedir(), '.pk'));
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

	test('ignores files (only returns directories)', () => {
		mkdirSync(path.join(fakeHome, '.pk', 'myproject'), {recursive: true});
		writeFileSync(path.join(fakeHome, '.pk', 'notadir.txt'), '');
		expect(listExistingProjects()).toEqual(['myproject']);
	});
});

describe('requireKnowledgeDir', () => {
	let orig: string | undefined;

	beforeEach(() => {
		orig = process.env.PK_KNOWLEDGE_DIR;
		delete process.env.PK_KNOWLEDGE_DIR;
	});

	afterEach(() => {
		if (orig === undefined) {
			delete process.env.PK_KNOWLEDGE_DIR;
		} else {
			process.env.PK_KNOWLEDGE_DIR = orig;
		}
	});

	test('returns PK_KNOWLEDGE_DIR when set', () => {
		process.env.PK_KNOWLEDGE_DIR = '/tmp/myproject';
		expect(requireKnowledgeDir()).toBe('/tmp/myproject');
	});

	test('throws when PK_KNOWLEDGE_DIR is unset', () => {
		expect(() => requireKnowledgeDir()).toThrow('PK_KNOWLEDGE_DIR is not set');
	});
});

describe('projectDir', () => {
	test('returns ~/.pk/<name>', () => {
		expect(projectDir('acme')).toBe(path.join(os.homedir(), '.pk', 'acme'));
	});

	test('handles names with hyphens', () => {
		expect(projectDir('my-project')).toBe(path.join(os.homedir(), '.pk', 'my-project'));
	});
});
