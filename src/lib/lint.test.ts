import {mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, test} from 'bun:test';
import {lintNotes, validateNote} from './lint.ts';

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

	// --- paths filter ---

	test('with paths filter only lints specified notes', async () => {
		const goodContent = VALID_NOTE;
		const badContent = VALID_NOTE
			.replace('id: note-2024-01-01-test', 'id: note-2024-01-01-bad')
			.replace('status: active', '')
			.replace('tags: [testing]', '');
		const root = await makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-good.md', content: goodContent},
			{subdir: 'notes', name: '2024-01-01-bad.md', content: badContent},
		]);
		const goodPath = path.join(root, 'notes', '2024-01-01-good.md');
		const {issues, noteCount} = await lintNotes(root, [goodPath]);
		rmSync(root, {recursive: true});
		expect(noteCount).toBe(1);
		expect(issues).toEqual([]);
	});

	test('with paths filter still runs cross-note checks', async () => {
		const root = await makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
			{subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE},
		]);
		const pathA = path.join(root, 'notes', '2024-01-01-a.md');
		const {issues} = await lintNotes(root, [pathA]);
		rmSync(root, {recursive: true});
		// Cross-note: Duplicate id check fires even when paths filter is set,
		// because it needs all notes to detect dupes across the project
		expect(issues.some(i => i.message.startsWith('duplicate id'))).toBe(true);
	});

	test('with empty paths array lints all notes', async () => {
		const root = await makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
		]);
		const {issues, noteCount} = await lintNotes(root, []);
		rmSync(root, {recursive: true});
		expect(noteCount).toBe(1);
		expect(issues).toEqual([]);
	});
});

describe('validateNote', () => {
	async function makeKnowledgeDir(notes: Array<{subdir: string; name: string; content: string}>): Promise<string> {
		const root = mkdtempSync(path.join(tmpdir(), 'pk-validate-'));
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
		const notePath = path.join(root, 'notes', '2024-01-01-test.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues).toEqual([]);
	});

	test('flags missing frontmatter fields', async () => {
		const content = `---
id: note-2024-01-01-x
type: note
title: X
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
		const notePath = path.join(root, 'notes', '2024-01-01-x.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('status'))).toBe(true);
		expect(issues.some(i => i.message.includes('tags'))).toBe(true);
	});

	test('flags wrong directory for type', async () => {
		const root = await makeKnowledgeDir([
			{subdir: 'decisions', name: '2024-01-01-misplaced.md', content: VALID_NOTE},
		]);
		const notePath = path.join(root, 'decisions', '2024-01-01-misplaced.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('must live in'))).toBe(true);
	});

	test('flags missing required section', async () => {
		const content = VALID_NOTE.replace('## Summary\n\nA short summary.', '');
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const notePath = path.join(root, 'notes', '2024-01-01-x.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('Summary'))).toBe(true);
	});

	test('flags invalid type', async () => {
		const content = VALID_NOTE.replace('type: note', 'type: bogus');
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const notePath = path.join(root, 'notes', '2024-01-01-x.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('invalid type'))).toBe(true);
	});

	test('flags unparseable frontmatter', async () => {
		const content = `---
this is not: valid yaml: [[
---

## Summary

text.
`;
		const root = await makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-bad.md', content}]);
		const notePath = path.join(root, 'notes', '2024-01-01-bad.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.level === 'error')).toBe(true);
	});

	test('returns error for non-existent file', async () => {
		const root = await makeKnowledgeDir([]);
		const notePath = path.join(root, 'notes', 'nope.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues).toHaveLength(1);
		expect(issues[0]!.message).toContain('not found');
	});

	test('does not run cross-note checks (no duplicate id)', async () => {
		const root = await makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
			{subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE},
		]);
		const notePath = path.join(root, 'notes', '2024-01-01-a.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		// ValidateNote is single-note: no cross-note duplicate id check
		expect(issues.some(i => i.message.startsWith('duplicate id'))).toBe(false);
	});

	test('flags processed source with empty Extracted Items', async () => {
		const content = `---
id: src-2024-01-01-test
type: source
title: Test Source
created: 2024-01-01
updated: 2024-01-01
status: processed
tags: [testing]
---

## Source

http://example.com

## Raw Material

Content here.

## Extracted Items

`;
		const root = await makeKnowledgeDir([{subdir: 'sources', name: '2024-01-01-test.md', content}]);
		const notePath = path.join(root, 'sources', '2024-01-01-test.md');
		const issues = await validateNote(notePath, root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('Extracted Items'))).toBe(true);
	});
});
