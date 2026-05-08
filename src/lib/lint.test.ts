import {mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, test} from 'bun:test';
import {lintNotes} from './lint.ts';

describe('lintNotes', () => {
	async function makeKnowledgeDir(notes: Array<{subdir: string; name: string; content: string}>): Promise<string> {
		const root = mkdtempSync(path.join(tmpdir(), 'pk-knowledge-'));
		await Promise.all(notes.map(async ({subdir, name, content}) => {
			const dir = path.join(root, subdir);
			mkdirSync(dir, {recursive: true});
			await Bun.write(path.join(dir, name), content);
		}));
		return root;
	}

	const VALID_NOTE = `---
id: note-2024-01-01-test
type: note
title: Test Note
created: 2024-01-01
updated: 2024-01-01
status: active
tags: [testing]
---

## Summary

A short summary.

## Details

Some details.

## Evidence

No evidence.

## Related

None.
`;

	test('returns no issues for a valid note', async () => {
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-test.md', content: VALID_NOTE}]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues).toEqual([]);
	});

	test('flags a note with missing required fields', async () => {
		const content = `---
id: note-2024-01-01-x
type: note
title: Missing Fields
created: 2024-01-01
updated: 2024-01-01
---

## Summary

text.

## Details

d.

## Evidence

e.

## Related

r.
`;
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('status'))).toBe(true);
		expect(issues.some(i => i.message.includes('tags'))).toBe(true);
	});

	test('flags a note stored in the wrong directory', async () => {
		const root = await makeKnowledgeDir([
			{subdir: 'decisions', name: '2024-01-01-misplaced.md', content: VALID_NOTE},
		]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('must live in'))).toBe(true);
	});

	test('reports noteCount matching number of files scanned', async () => {
		const root = await makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
			{subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE},
		]);
		const {noteCount} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(noteCount).toBe(2);
	});

	test('flags a note with an invalid type', async () => {
		const content = VALID_NOTE.replace('type: note', 'type: bogus');
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('invalid type'))).toBe(true);
	});

	test('flags a note with an invalid status for its type', async () => {
		const content = VALID_NOTE.replace('status: active', 'status: proposed');
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('invalid status'))).toBe(true);
	});

	test('flags a note where tags is not an array', async () => {
		const content = VALID_NOTE.replace('tags: [testing]', 'tags: not-a-list');
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('tags'))).toBe(true);
	});

	test('flags a note missing a required section', async () => {
		const content = VALID_NOTE.replace('## Summary\n\nA short summary.', '');
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('Summary'))).toBe(true);
	});

	test('flags a duplicate id', async () => {
		const root = await makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
			{subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE},
		]);
		const {issues} = await lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.startsWith('duplicate id'))).toBe(true);
	});
});
