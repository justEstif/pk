import {mkdirSync, rmSync, existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
	describe, test, expect, beforeAll, beforeEach, afterEach,
} from 'bun:test';
import {$} from 'bun';

const CLI_PATH = path.resolve(import.meta.dir, '../../dist/index.js');
const PK_HOME = path.join(os.tmpdir(), `pk-home-${Date.now()}`);

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
});
