import {
	mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, test} from 'bun:test';
import {lintNotes} from './lint.ts';

describe('lintNotes', () => {
	function makeKnowledgeDir(notes: Array<{subdir: string; name: string; content: string}>): string {
		const root = mkdtempSync(path.join(tmpdir(), 'pk-knowledge-'));
		for (const {subdir, name, content} of notes) {
			const dir = path.join(root, subdir);
			mkdirSync(dir, {recursive: true});
			writeFileSync(path.join(dir, name), content);
		}

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

	test('returns no issues for a valid note', () => {
		const root = makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-test.md', content: VALID_NOTE}]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues).toEqual([]);
	});

	test('flags a note with missing required fields', () => {
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
		const root = makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('status'))).toBe(true);
		expect(issues.some(i => i.message.includes('tags'))).toBe(true);
	});

	test('flags a note stored in the wrong directory', () => {
		const root = makeKnowledgeDir([
			{subdir: 'decisions', name: '2024-01-01-misplaced.md', content: VALID_NOTE},
		]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('must live in'))).toBe(true);
	});

	test('reports noteCount matching number of files scanned', () => {
		const root = makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
			{subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE},
		]);
		const {noteCount} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(noteCount).toBe(2);
	});

	test('flags a note with an invalid type', () => {
		const content = VALID_NOTE.replace('type: note', 'type: bogus');
		const root = makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('invalid type'))).toBe(true);
	});

	test('flags a note with an invalid status for its type', () => {
		const content = VALID_NOTE.replace('status: active', 'status: proposed');
		const root = makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('invalid status'))).toBe(true);
	});

	test('flags a note where tags is not an array', () => {
		const content = VALID_NOTE.replace('tags: [testing]', 'tags: not-a-list');
		const root = makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('tags'))).toBe(true);
	});

	test('flags a note missing a required section', () => {
		const content = VALID_NOTE.replace('## Summary\n\nA short summary.', '');
		const root = makeKnowledgeDir([{subdir: 'notes', name: '2024-01-01-x.md', content}]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.includes('Summary'))).toBe(true);
	});

	test('flags a duplicate id', () => {
		const root = makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
			{subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE},
		]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.startsWith('duplicate id'))).toBe(true);
	});
});
