import {mkdirSync, rmSync, existsSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import {
	describe,
	test,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
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
	JsonReadOutput,
} from '../lib/runner.ts';

const cliPath = path.resolve(import.meta.dir, '../../dist/index.js');
const pkHome = path.join(os.tmpdir(), `pk-home-${Date.now()}`);

function parseJson<T>(text: string): T {
	const parsed: unknown = JSON.parse(text);
	return parsed as T;
}

describe('pk CLI e2e tests', () => {
	let projectName: string;
	let knowledgeDir: string;

	beforeAll(async () => {
		await $`bun run build`.quiet();
		// Set up custom pkHome
		process.env.HOME = pkHome;
	});

	beforeEach(() => {
		projectName = `test-project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		knowledgeDir = path.join(pkHome, '.pk', projectName);
	});

	afterEach(async () => {
		// Cleanup project directory
		if (existsSync(knowledgeDir)) {
			rmSync(knowledgeDir, {recursive: true, force: true});
		}
	});

	describe('pk init', () => {
		test('initializes a new project with git repository', async () => {
			const result
				= await $`${cliPath} init ${projectName} --harness claude`.quiet();
			expect(result.exitCode).toBe(0);
			expect(existsSync(knowledgeDir)).toBe(true);
			expect(existsSync(path.join(knowledgeDir, '.git'))).toBe(true);
		});

		test('fails with clear error when git is not installed', async () => {
			const result
				= await $`PATH=/usr/bin/nonexistent ${cliPath} init ${projectName} --harness claude`.nothrow();
			expect(result.exitCode).toBe(1);
			expect(result.stderr.toString()).toContain('git');
		});

		test('re-init on existing project preserves data', async () => {
			await $`${cliPath} init ${projectName} --harness claude`.quiet();
			const noteResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Re-init test"`.quiet();
			expect(noteResult.exitCode).toBe(0);
			// Re-init same project
			const reResult
				= await $`${cliPath} init ${projectName} --harness claude`.quiet();
			expect(reResult.exitCode).toBe(0);
			// Note should still exist
			const {path: notePath} = parseJson<JsonNewOutput>(noteResult.stdout.toString().trim());
			expect(existsSync(notePath)).toBe(true);
		});

		test('fails with clear error when home directory is not writable', async () => {
			const readOnlyHome = path.join(os.tmpdir(), `pk-readonly-${Date.now()}`);
			mkdirSync(readOnlyHome, {recursive: true});
			// Make the home directory read-only
			await $`chmod 000 ${readOnlyHome}`.quiet();
			try {
				const result
					= await $`HOME=${readOnlyHome} ${cliPath} init ${projectName} --harness claude`.nothrow();
				expect(result.exitCode).toBe(1);
				const stderr = result.stderr.toString();
				expect(stderr).toContain('pk requires');
				expect(stderr.toLowerCase()).toMatch(/writ|perm|access/iv);
			} finally {
				await $`chmod 755 ${readOnlyHome}`.quiet();
				rmSync(readOnlyHome, {recursive: true, force: true});
			}
		});
	});

	describe('pk new (with git integration)', () => {
		beforeEach(async () => {
			await $`${cliPath} init ${projectName} --harness claude`.quiet();
		});

		test('creates a note and commits to git', async () => {
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Test E2E Note" --tags e2e,test`.quiet();
			expect(result.exitCode).toBe(0);
			const {path: notePath} = parseJson<JsonNewOutput>(result.stdout.toString().trim());
			expect(existsSync(notePath)).toBe(true);
			const logResult
				= await $`git -C ${knowledgeDir} log --oneline -n 1`.quiet();
			expect(logResult.stdout.toString()).toContain('knowledge: intake note');
		});

		test('rejects duplicate title with error', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Duplicate Test"`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Duplicate Test"`.nothrow();
			expect(result.exitCode).toBe(1);
			expect(result.stderr.toString()).toContain('Already exists');
		});
	});

	describe('pk delete', () => {
		beforeEach(async () => {
			await $`${cliPath} init ${projectName} --harness claude`.quiet();
		});

		test('deletes a note and commits deletion', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Delete Test Note" --tags delete-test`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			expect(existsSync(notePath)).toBe(true);
			const deleteResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} delete ${notePath}`.quiet();
			expect(deleteResult.exitCode).toBe(0);
			expect(existsSync(notePath)).toBe(false);
			const logResult
				= await $`git -C ${knowledgeDir} log --format=%s -n 1`.quiet();
			expect(logResult.stdout.toString()).toContain('knowledge: delete note');
		});
	});

	describe('pk history', () => {
		beforeEach(async () => {
			await $`${cliPath} init ${projectName} --harness claude`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "History Test 1" --tags history`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "History Test 2" --tags history`.quiet();
		});

		test('returns history as JSON by default', async () => {
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} history --limit 10`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonHistoryOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.entries)).toBe(true);
			expect(output.entries.length).toBeGreaterThan(0);
			expect(output.entries[0]).toHaveProperty('hash');
			expect(output.entries[0]).toHaveProperty('message');
		});

		test('filters history by operation type', async () => {
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} history --filter-operation create --limit 5`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonHistoryOutput>(result.stdout.toString().trim());
			for (const entry of output.entries) {
				expect(entry.message).toContain('intake');
			}
		});

		test('outputs human-readable history with --pretty', async () => {
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} history --limit 10 --pretty`.quiet();
			expect(result.exitCode).toBe(0);
			const output = result.stdout.toString();
			expect(output).toContain('intake note');
			expect(output).toMatch(/\d+\/\d+\/\d+/v);
		});

		test('prime and search create events visible in history', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} prime`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} index`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} search "History Test"`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} history --limit 20 --pretty`.quiet();
			expect(result.exitCode).toBe(0);
			const output = result.stdout.toString();
			expect(output).toContain('session-open');
			expect(output).toContain('search');
			expect(output).toContain('History Test');
		});
	});

	describe('integration workflow', () => {
		test('full CRUD workflow creates correct git history', async () => {
			await $`${cliPath} init ${projectName} --harness claude`.quiet();
			expect(existsSync(path.join(knowledgeDir, '.git'))).toBe(true);
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Workflow Test" --tags workflow`.quiet();
			const createLog
				= await $`git -C ${knowledgeDir} log --format=%s -n 1`.quiet();
			expect(createLog.stdout.toString()).toContain('knowledge: intake note');
			const notesResult = await $`ls ${knowledgeDir}/notes/`.quiet();
			const noteFileName = notesResult.stdout.toString().split('\n')[0];
			if (!noteFileName) {
				throw new Error('No notes found to delete');
			}

			const fullNotePath = path.join(knowledgeDir, 'notes', noteFileName);
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} delete ${fullNotePath}`.quiet();
			const deleteLog
				= await $`git -C ${knowledgeDir} log --format=%s -n 1`.quiet();
			expect(deleteLog.stdout.toString()).toContain('knowledge: delete note');
			const historyResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} history --limit 5 --pretty`.quiet();
			const historyOutput = historyResult.stdout.toString();
			expect(historyOutput).toContain('intake note');
			expect(historyOutput).toContain('delete note');
		});
	});

	describe('pk lint', () => {
		beforeEach(async () => {
			await $`${cliPath} init ${projectName} --harness claude`.quiet();
		});

		test('passes for valid notes', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Lint Test Note" --tags lint`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBe(0);
		});

		test('accepts specific paths to lint', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Specific Lint" --tags lint`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint ${notePath}`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBe(0);
			expect(output.noteCount).toBe(1);
		});

		test('reports errors for invalid notes', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Bad Note" --tags lint`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			await Bun.write(notePath, '---\ntype: note\n---\n\n## Summary\n\ntext.');
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint`.quiet();
			expect(result.exitCode).toBe(0); // JSON default exits 0 with errors in payload
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBeGreaterThan(0);
			expect(output.issues.some(i => i.level === 'error')).toBe(true);
		});

		test('reports errors for note with no frontmatter delimiters', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "No Delimiters" --tags lint`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			await Bun.write(
				notePath,
				'Just some plain text with no frontmatter at all',
			);
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint`.quiet();
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBeGreaterThan(0);
			expect(output.issues.some(i => i.level === 'error')).toBe(true);
		});

		test('reports errors for note with malformed YAML', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Bad YAML" --tags lint`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			await Bun.write(
				notePath,
				'---\ntype: note\nstatus: open\ntags: [unclosed\n---\n\n## Summary\n\nText.',
			);
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint`.quiet();
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBeGreaterThan(0);
		});

		test('reports errors for empty file', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Empty File" --tags lint`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			await Bun.write(notePath, '');
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint`.quiet();
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBeGreaterThan(0);
			expect(output.issues.some(i => i.level === 'error')).toBe(true);
		});

		test('--pretty exits 1 on errors', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Pretty Lint Error" --tags lint`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			await Bun.write(notePath, '---\ntype: note\n---\n\n## Summary\n\ntext.');
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint --pretty`.nothrow();
			expect(result.exitCode).toBe(1);
		});
	});

	describe('pk JSON output', () => {
		beforeEach(async () => {
			await $`${cliPath} init ${projectName} --harness claude`.quiet();
		});

		test('pk new outputs valid JSON with path', async () => {
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "JSON Test Note"`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonNewOutput>(result.stdout.toString().trim());
			expect(typeof output.path).toBe('string');
			expect(existsSync(output.path)).toBe(true);
		});

		test('pk lint outputs valid JSON with issues and noteCount', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Lint JSON Note" --tags lint`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.issues)).toBe(true);
			expect(typeof output.noteCount).toBe('number');
		});

		test('pk lint exits 0 even with errors (errors in JSON)', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Bad JSON Note" --tags lint`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			await Bun.write(notePath, '---\ntype: note\n---\n\n## Summary\n\ntext.');
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} lint`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonLintOutput>(result.stdout.toString().trim());
			expect(output.issues.length).toBeGreaterThan(0);
			expect(output.issues.some(i => i.level === 'error')).toBe(true);
		});

		test('pk delete outputs valid JSON with path and status', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Delete JSON Note"`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} delete ${notePath}`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonDeleteOutput>(result.stdout.toString().trim());
			expect(output).toEqual({path: notePath, status: 'deleted'});
		});

		test('pk history outputs valid JSON with entries array', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "History JSON Note"`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} history`.quiet();
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

		test('pk synthesize --all outputs valid JSON with notes and label', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Synth JSON Note"`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} synthesize --all`.quiet();
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

		test('pk vocab outputs valid JSON with tags array', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Vocab JSON Note" --tags json-test`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} index`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} vocab`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonVocabOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.tags)).toBe(true);
		});

		test('pk search outputs valid JSON with results array', async () => {
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Search JSON Note" --tags search-test`.quiet();
			await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} index`.quiet();
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} search "Search JSON"`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonSearchOutput>(result.stdout.toString().trim());
			expect(Array.isArray(output.results)).toBe(true);
		});

		test('pk rebuild is not a command', async () => {
			const result = await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} rebuild`.nothrow();
			expect(result.exitCode).toBe(1);
			expect(result.stderr.toString()).toContain('unknown command \'rebuild\'');
		});

		test('pk read outputs valid JSON with path and content', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Read JSON Note" --tags read-test`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} read ${notePath}`.quiet();
			expect(result.exitCode).toBe(0);
			const output = parseJson<JsonReadOutput>(result.stdout.toString().trim());
			expect(output.path).toBe(notePath);
			expect(typeof output.content).toBe('string');
			expect(output.content).toContain('Read JSON Note');
		});

		test('pk read --pretty outputs note content as plain text', async () => {
			const createResult
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} new note "Read Plain Note"`.quiet();
			const {path: notePath} = parseJson<JsonNewOutput>(createResult.stdout.toString().trim());
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} read ${notePath} --pretty`.quiet();
			expect(result.exitCode).toBe(0);
			expect(result.stdout.toString()).toContain('Read Plain Note');
		});

		test('pk read exits 1 for missing file', async () => {
			const result
				= await $`PK_KNOWLEDGE_DIR=${knowledgeDir} ${cliPath} read /nonexistent/path.md`.nothrow();
			expect(result.exitCode).toBe(1);
		});

		test('pk config exposes structured embedding config', async () => {
			const defaultResult = await $`HOME=${pkHome} ${cliPath} config`.quiet();
			expect(parseJson<{
				embedding: {
					enabled: boolean;
					provider: string | null;
					model: string | null;
				};
			}>(defaultResult.stdout.toString().trim())).toEqual({
				embedding: {enabled: false, provider: null, model: null},
			});

			const enableResult
				= await $`HOME=${pkHome} ${cliPath} config --embedding all-MiniLM-L6-v2`.quiet();
			expect(parseJson<{
				embedding: {
					enabled: boolean;
					provider: string | null;
					model: string | null;
				};
			}>(enableResult.stdout.toString().trim())).toEqual({
				embedding: {
					enabled: true,
					provider: 'local',
					model: 'all-MiniLM-L6-v2',
				},
			});

			const disableResult
				= await $`HOME=${pkHome} ${cliPath} config --no-embedding`.quiet();
			expect(parseJson<{
				embedding: {
					enabled: boolean;
					provider: string | null;
					model: string | null;
				};
			}>(disableResult.stdout.toString().trim())).toEqual({
				embedding: {enabled: false, provider: null, model: null},
			});
		});
	});
});
