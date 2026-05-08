import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {$} from 'bun';
import {
	describe, test, expect, beforeEach, afterEach,
} from 'bun:test';
import {createKnowledgeNote, updateKnowledgeNote, deleteKnowledgeNote} from './operations.ts';

describe('createKnowledgeNote', () => {
	let knowledgeDir: string;

	beforeEach(async () => {
		// Create temp knowledge directory with git repo
		knowledgeDir = path.join(tmpdir(), `pk-test-${Date.now()}`);
		mkdirSync(knowledgeDir, {recursive: true});

		// Initialize git repo (required for commits)
		await $`git init`.cwd(knowledgeDir).quiet();
		await $`git config user.name pk`.cwd(knowledgeDir).quiet();
		await $`git config user.email pk@local`.cwd(knowledgeDir).quiet();
	});

	afterEach(() => {
		// Cleanup temp directory
		rmSync(knowledgeDir, {recursive: true, force: true});
	});

	test('creates a note and commits it to git', async () => {
		const filePath = await createKnowledgeNote(knowledgeDir, 'note', 'test-note', 'test');

		expect(filePath).toBeTruthy();
		expect(filePath).toContain('notes/');
		expect(filePath).toContain('test-note');

		// Verify file exists
		const content = await Bun.file(filePath).text();
		expect(content).toContain('test-note');
		expect(content).toContain('## Summary');

		// Verify git commit was created
		const logResult = await $`git log --oneline`.cwd(knowledgeDir).quiet();
		const log = logResult.stdout.toString();
		expect(log).toContain('knowledge: intake');
	});
});
