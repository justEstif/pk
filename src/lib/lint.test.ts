import {
	mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, test} from 'bun:test';
import {
	type Issue, type IssueLevel,
	checkFrontmatter,
	checkRequiredSections,
	checkSourceExtracted,
	checkLength,
	lintNotes,
} from './lint.ts';

const P = '/knowledge/notes/2024-01-01-test.md';
const KNOWLEDGE_DIR = '/knowledge';

// Helper: wraps issues array so IssueLevel and Issue types are used explicitly
function issuesOf(level: IssueLevel, items: Issue[]): Issue[] {
	return items.filter(i => i.level === level);
}

void issuesOf;

// ---------------------------------------------------------------------------
// checkFrontmatter
// ---------------------------------------------------------------------------

describe('checkFrontmatter', () => {
	const valid = {
		id: 'note-2024-01-01-test',
		type: 'note',
		title: 'My Note',
		created: '2024-01-01',
		updated: '2024-01-01',
		status: 'active',
		tags: ['engineering'],
	};

	test('returns no issues for fully valid frontmatter', () => {
		expect(checkFrontmatter(valid, P, KNOWLEDGE_DIR)).toEqual([]);
	});

	test('flags each missing required field as an error', () => {
		const issues = checkFrontmatter({}, P, KNOWLEDGE_DIR);
		expect(issues.every(i => i.level === 'error')).toBe(true);
		const messages = issues.map(i => i.message);
		expect(messages.some(m => m.includes('id'))).toBe(true);
		expect(messages.some(m => m.includes('type'))).toBe(true);
		expect(messages.some(m => m.includes('title'))).toBe(true);
		expect(messages.some(m => m.includes('status'))).toBe(true);
		expect(messages.some(m => m.includes('tags'))).toBe(true);
	});

	test('flags invalid type as an error', () => {
		const issues = checkFrontmatter({...valid, type: 'bogus'}, P, KNOWLEDGE_DIR);
		expect(issues.some(i => i.level === 'error' && i.message.includes('invalid type'))).toBe(true);
	});

	test('flags invalid status for the given type as an error', () => {
		const issues = checkFrontmatter({...valid, status: 'proposed'}, P, KNOWLEDGE_DIR); // Proposed is decision-only
		expect(issues.some(i => i.level === 'error' && i.message.includes('invalid status'))).toBe(true);
	});

	test('flags tags that is not an array as an error', () => {
		const issues = checkFrontmatter({...valid, tags: 'not-an-array'}, P, KNOWLEDGE_DIR);
		expect(issues.some(i => i.level === 'error' && i.message.includes('flat list'))).toBe(true);
	});

	test('returns a warn issue for empty tags', () => {
		const issues = checkFrontmatter({...valid, tags: []}, P, KNOWLEDGE_DIR);
		expect(issues.some(i => i.level === 'warn' && i.message.includes('tags is empty'))).toBe(true);
	});

	test('flags a file stored in the wrong directory as an error', () => {
		const wrongPath = '/knowledge/decisions/2024-01-01-test.md'; // Type is note, should be in notes/
		const issues = checkFrontmatter(valid, wrongPath, KNOWLEDGE_DIR);
		expect(issues.some(i => i.level === 'error' && i.message.includes('must live in'))).toBe(true);
	});

	test('attaches the provided path to every issue', () => {
		const issues = checkFrontmatter({}, P, KNOWLEDGE_DIR);
		expect(issues.every(i => i.path === P)).toBe(true);
	});

	test('skips location check when type is invalid', () => {
		// With an invalid type, we should not see a "must live in" error — type error is enough
		const issues = checkFrontmatter({...valid, type: 'bogus'}, '/some/random/path.md', KNOWLEDGE_DIR);
		expect(issues.every(i => !i.message.includes('must live in'))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// checkRequiredSections
// ---------------------------------------------------------------------------

describe('checkRequiredSections', () => {
	test('returns no issues when all required sections are present', () => {
		const body = '## Summary\n\ntext\n\n## Details\n\nmore\n\n## Evidence\n\n.\n\n## Related\n\n.\n';
		expect(checkRequiredSections(body, 'note', P)).toEqual([]);
	});

	test('flags each missing required section as an error', () => {
		const body = '## Summary\n\ntext\n'; // Missing Details, Evidence, Related
		const issues = checkRequiredSections(body, 'note', P);
		expect(issues.length).toBe(3);
		expect(issues.every(i => i.level === 'error')).toBe(true);
		expect(issues.every(i => i.message.startsWith('missing section:'))).toBe(true);
	});

	test('returns no issues for a type with no required sections', () => {
		// There is no type with empty required sections, but an unknown type produces []
		expect(checkRequiredSections('anything', 'unknown_type', P)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// checkSourceExtracted
// ---------------------------------------------------------------------------

describe('checkSourceExtracted', () => {
	test('returns no issues for a non-source note', () => {
		expect(checkSourceExtracted('anything', {type: 'note', status: 'active'}, P)).toEqual([]);
	});

	test('returns no issues for an unprocessed source', () => {
		const body = '## Extracted Items\n\n';
		expect(checkSourceExtracted(body, {type: 'source', status: 'unprocessed'}, P)).toEqual([]);
	});

	test('returns no issues for a processed source with content in Extracted Items', () => {
		const body = '## Extracted Items\n\n- [[some-note]]\n';
		expect(checkSourceExtracted(body, {type: 'source', status: 'processed'}, P)).toEqual([]);
	});

	test('returns a warn issue for a processed source with empty Extracted Items', () => {
		const body = '## Extracted Items\n\n';
		const issues = checkSourceExtracted(body, {type: 'source', status: 'processed'}, P);
		expect(issues).toHaveLength(1);
		expect(issues[0]?.level).toBe('warn');
		expect(issues[0]?.message).toContain('empty Extracted Items');
	});

	test('returns a warn issue when Extracted Items section exists but only whitespace', () => {
		const body = '## Extracted Items\n\n   \n';
		const issues = checkSourceExtracted(body, {type: 'source', status: 'processed'}, P);
		expect(issues).toHaveLength(1);
		expect(issues[0]?.level).toBe('warn');
	});
});

// ---------------------------------------------------------------------------
// checkLength (needs real files)
// ---------------------------------------------------------------------------

describe('checkLength', () => {
	function makeTmpFile(content: string): string {
		const dir = mkdtempSync(path.join(tmpdir(), 'pk-test-'));
		const file = path.join(dir, 'note.md');
		writeFileSync(file, content);
		return file;
	}

	test('returns no issues for a note within the line threshold', () => {
		const content = Array.from({length: 50}).fill('line').join('\n');
		const file = makeTmpFile(content);
		expect(checkLength(file, 'note')).toEqual([]);
		rmSync(path.dirname(file), {recursive: true});
	});

	test('returns a warn issue when line count exceeds the type threshold', () => {
		const content = Array.from({length: 160}).fill('line').join('\n'); // Note threshold is 150
		const file = makeTmpFile(content);
		const issues = checkLength(file, 'note');
		expect(issues.some(i => i.level === 'warn' && i.message.includes('exceeds'))).toBe(true);
		rmSync(path.dirname(file), {recursive: true});
	});

	test('returns an error issue when a non-source note exceeds 400 lines', () => {
		const content = Array.from({length: 410}).fill('line').join('\n');
		const file = makeTmpFile(content);
		const issues = checkLength(file, 'note');
		expect(issues.some(i => i.level === 'error' && i.message.includes('400 lines'))).toBe(true);
		rmSync(path.dirname(file), {recursive: true});
	});

	test('does not error for a source note exceeding 400 lines', () => {
		const content = Array.from({length: 410}).fill('line').join('\n');
		const file = makeTmpFile(content);
		const issues = checkLength(file, 'source');
		expect(issues.every(i => i.level !== 'error')).toBe(true);
		rmSync(path.dirname(file), {recursive: true});
	});
});

// ---------------------------------------------------------------------------
// lintNotes (integration: real knowledge directory)
// ---------------------------------------------------------------------------

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
			// Valid note dirs require notes/ to live in notes/, decisions in decisions/, etc.
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

	test('flags a note with a duplicate id', () => {
		const root = makeKnowledgeDir([
			{subdir: 'notes', name: '2024-01-01-a.md', content: VALID_NOTE},
			{subdir: 'notes', name: '2024-01-01-b.md', content: VALID_NOTE}, // Same id
		]);
		const {issues} = lintNotes(root);
		rmSync(root, {recursive: true});
		expect(issues.some(i => i.message.startsWith('duplicate id'))).toBe(true);
	});
});
