import {mkdirSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	afterEach, beforeEach, describe, expect, test,
} from 'bun:test';
import {createNote} from './notes.ts';

describe('createNote', () => {
	let dir: string;

	beforeEach(() => {
		dir = path.join(os.tmpdir(), `pk-notes-test-${Date.now()}`);
		mkdirSync(dir, {recursive: true});
	});

	afterEach(() => {
		rmSync(dir, {recursive: true, force: true});
	});

	test('creates a note file and returns its path', async () => {
		const notePath = await createNote(dir, 'decision', 'Use SQLite', '');
		expect(await Bun.file(notePath).exists()).toBe(true);
		expect(notePath).toMatch(/decisions\/\d{4}-\d{2}-\d{2}-use-sqlite\.md$/v);
	});

	test('writes frontmatter with correct type and title', async () => {
		const notePath = await createNote(dir, 'note', 'My Note', '');
		const content = await Bun.file(notePath).text();
		expect(content).toContain('type: note');
		expect(content).toContain('title: My Note');
	});

	test('tags are written into frontmatter', async () => {
		const notePath = await createNote(dir, 'question', 'Is this right?', 'arch, scope');
		const content = await Bun.file(notePath).text();
		expect(content).toContain('arch');
		expect(content).toContain('scope');
	});

	test('throws if type is unknown', async () => {
		expect(createNote(dir, 'bogus', 'title', '')).rejects.toThrow('Unknown type: bogus');
	});

	test('throws if note already exists', async () => {
		await createNote(dir, 'note', 'Duplicate', '');
		expect(createNote(dir, 'note', 'Duplicate', '')).rejects.toThrow(/Already exists/v);
	});
});
