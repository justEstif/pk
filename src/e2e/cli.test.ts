import {mkdirSync, rmSync, existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
	describe, test, expect, beforeAll, beforeEach, afterEach,
} from 'bun:test';
import {$} from 'bun';
import type {
	JsonNewOutput,
	JsonLintOutput,
	JsonDeleteOutput,
	JsonHistoryOutput,
	JsonSynthesizeOutput,
	JsonVocabOutput,
	JsonSearchOutput,
} from '../lib/json-output.ts';

const CLI_PATH = path.resolve(import.meta.dir, '../../dist/index.js');
const PK_HOME = path.join(os.tmpdir(), `pk-home-${Date.now()}`);

function parseJson<T>(text: string): T {
	return JSON.parse(text) as T;
}

describe('pk CLI e2e tests', () => {
	let projectName: string;
	let knowledgeDir: string;

	beforeAll(async () => {
		await $`bun run build`.quiet();
		// Set up custom PK_HOME
		process.env.HOME = PK_HOME;
	});

	beforeEach(() => {
		projectName = `test-project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		knowledgeDir = path.join(PK_HOME, '.pk', projectName);
	});

	afterEach(async () => {
		// Cleanup project directory
		if (existsSync(knowledgeDir)) {
			rmSync(knowledgeDir, {recursive: true, force: true});
		}
	});

	describe('pk init', () => {
		test('initializes a new project with git repository', async () => {
			const result = await $`${CLI_PATH} init ${projectName} --harness claude`.quiet();
			expect(result.exitCode).toBe(0);
			expect(existsSync(knowledgeDir)).toBe(true);
			expect(existsSync(path.join(knowledgeDir, '.git'))).toBe(true);
		});
	});

	describe('pk new (with git integration)', () => {
		beforeEach(async () => {
			await $`${CLI_PATH} init ${projectName} --harness claude`.quiet();
		});

		test('creates a note and commits to git', async () => {
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Test E2E Note" --tags e2e,test`.quiet();
			expect(result.exitCode).toBe(0);
			const notePath = result.stdout.toString().trim();
			expect(existsSync(notePath)).toBe(true);
			const logResult = await $`git -C ${knowledgeDir} log --oneline -n 1`.quiet();
			expect(logResult.stdout.toString()).toContain('knowledge: intake note');
		});
	});

	describe('pk delete', () => {
		beforeEach(async () => {
			await $`${CLI_PATH} init ${projectName} --harness claude`.quiet();
		});

		test('deletes a note and commits deletion', async () => {
			const createResult = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Delete Test Note" --tags delete-test`.quiet();
			const notePath = createResult.stdout.toString().trim();
			expect(existsSync(notePath)).toBe(true);
			const deleteResult = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} delete ${notePath} --yes`.quiet();
			expect(deleteResult.exitCode).toBe(0);
			expect(existsSync(notePath)).toBe(false);
			const logResult = await $`git -C ${knowledgeDir} log --format=%s -n 1`.quiet();
			expect(logResult.stdout.toString()).toContain('knowledge: delete note');
		});
	});

	describe('pk history', () => {
		beforeEach(async () => {
			await $`${CLI_PATH} init ${projectName} --harness claude`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "History Test 1" --tags history`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "History Test 2" --tags history`.quiet();
		});

		test('displays knowledge history with commits', async () => {
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} history --limit 10`.quiet();
			expect(result.exitCode).toBe(0);
			const output = result.stdout.toString();
			expect(output).toContain('intake note');
			expect(output).toMatch(/\d+\/\d+\/\d+/v);
		});

		test('filters history by operation type', async () => {
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} history --filter-operation create --limit 5`.quiet();
			expect(result.exitCode).toBe(0);
			const output = result.stdout.toString();
			const lines = output.split('\n').filter(line => line.includes('|'));
			for (const line of lines) {
				expect(line).toMatch(/intake/v);
			}
		});
	});

	describe('integration workflow', () => {
		test('full CRUD workflow creates correct git history', async () => {
			await $`${CLI_PATH} init ${projectName} --harness claude`.quiet();
			expect(existsSync(path.join(knowledgeDir, '.git'))).toBe(true);
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Workflow Test" --tags workflow`.quiet();
			const createLog = await $`git -C ${knowledgeDir} log --format=%s -n 1`.quiet();
			expect(createLog.stdout.toString()).toContain('knowledge: intake note');
			const notesResult = await $`ls ${knowledgeDir}/notes/`.quiet();
			const notePath = notesResult.stdout.toString().split('\n')[0];
			if (!notePath) {
				throw new Error('No notes found to delete');
			}

			const fullNotePath = path.join(knowledgeDir, 'notes', notePath);
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} delete ${fullNotePath} --yes`.quiet();
			const deleteLog = await $`git -C ${knowledgeDir} log --format=%s -n 1`.quiet();
			expect(deleteLog.stdout.toString()).toContain('knowledge: delete note');
			const historyResult = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} history --limit 5`.quiet();
			const historyOutput = historyResult.stdout.toString();
			expect(historyOutput).toContain('intake note');
			expect(historyOutput).toContain('delete note');
		});
	});
	describe('pk lint', () => {
		beforeEach(async () => {
			await $`${CLI_PATH} init ${projectName} --harness claude`.quiet();
		});

		test('passes for valid notes', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Lint Test Note" --tags lint`.quiet();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} lint`.quiet();
			expect(result.exitCode).toBe(0);
			expect(result.stdout.toString()).toContain('lint passed');
		});

		test('accepts specific paths to lint', async () => {
			const createResult = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Specific Lint" --tags lint`.quiet();
			const notePath = createResult.stdout.toString().trim();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} lint ${notePath}`.quiet();
			expect(result.exitCode).toBe(0);
			expect(result.stdout.toString()).toContain('lint passed');
			expect(result.stdout.toString()).toContain('1 files');
		});

		test('reports errors for invalid notes', async () => {
			// Create a note, then corrupt it
			const createResult = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Bad Note" --tags lint`.quiet();
			const notePath = createResult.stdout.toString().trim();
			// Write invalid content (missing required fields)
			await Bun.write(notePath, '---\ntype: note\n---\n\n## Summary\n\ntext.');
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} lint`.nothrow();
			expect(result.exitCode).toBe(1);
		});
	});

	describe('pk --json flag', () => {
		beforeEach(async () => {
			await $`${CLI_PATH} init ${projectName} --harness claude`.quiet();
		});

		test('pk new --json outputs valid JSON with path', async () => {
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "JSON Test Note" --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonNewOutput>(result.stdout.toString().trim());
			expect(typeof output.path).toBe('string');
			expect(existsSync(output.path)).toBe(true);
		});

		test('pk lint --json outputs valid JSON with issues and noteCount', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Lint JSON Note" --tags lint`.quiet();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} lint --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.issues)).toBe(true);
			expect(typeof output.noteCount).toBe('number');
		});

		test('pk lint --json exits 0 even with errors (errors in JSON)', async () => {
			const createResult = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Bad JSON Note" --tags lint`.quiet();
			const notePath = createResult.stdout.toString().trim();
			await Bun.write(notePath, '---\ntype: note\n---\n\n## Summary\n\ntext.');
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} lint --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBeGreaterThan(0);
			expect(output.issues.some(i => i.level === 'error')).toBe(true);
		});

		test('pk delete --json outputs valid JSON with path and status', async () => {
			const createResult = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Delete JSON Note"`.quiet();
			const notePath = createResult.stdout.toString().trim();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} delete ${notePath} --yes --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonDeleteOutput>(result.stdout.toString().trim());
			expect(output).toEqual({path: notePath, status: 'deleted'});
		});

		test('pk history --json outputs valid JSON with entries array', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "History JSON Note"`.quiet();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} history --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonHistoryOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.entries)).toBe(true);
			expect(output.entries.length).toBeGreaterThan(0);
			const entry = output.entries[0];
			expect(entry).toHaveProperty('hash');
			expect(entry).toHaveProperty('timestamp');
			expect(entry).toHaveProperty('message');
			expect(entry).toHaveProperty('type');
		});

		test('pk synthesize --all --json outputs valid JSON with notes and label', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Synth JSON Note"`.quiet();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} synthesize --all --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonSynthesizeOutput>(result.stdout.toString().trim());
			expect(typeof output.label).toBe('string');
			expect(Array.isArray(output.notes)).toBe(true);
			expect(output.notes.length).toBeGreaterThan(0);
			const note = output.notes[0];
			expect(note).toHaveProperty('path');
			expect(note).toHaveProperty('type');
			expect(note).toHaveProperty('status');
			expect(note).toHaveProperty('title');
			expect(note).toHaveProperty('tags');
			expect(note).toHaveProperty('excerpt');
		});

		test('pk vocab --json outputs valid JSON with tags array', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Vocab JSON Note" --tags json-test`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} index`.quiet();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} vocab --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonVocabOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.tags)).toBe(true);
		});

		test('pk search --json outputs valid JSON with results array', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} new note "Search JSON Note" --tags search-test`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} index`.quiet();
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${CLI_PATH} search "Search JSON" --json`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonSearchOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.results)).toBe(true);
		});
	});
});
