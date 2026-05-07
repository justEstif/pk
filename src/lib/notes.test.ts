import {describe, expect, test} from 'bun:test';
import {
	type Note, slugify, excerpt, TYPE_DIRS,
} from './notes.ts';

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe('slugify', () => {
	test('lowercases and replaces spaces with hyphens', () => {
		expect(slugify('Hello World')).toBe('hello-world');
	});

	test('collapses multiple non-alphanumeric chars into one hyphen', () => {
		expect(slugify('foo  --  bar')).toBe('foo-bar');
	});

	test('strips leading and trailing hyphens', () => {
		expect(slugify('  leading and trailing  ')).toBe('leading-and-trailing');
	});

	test('handles already-lowercase alphanumeric input unchanged', () => {
		expect(slugify('simple')).toBe('simple');
	});
});

// ---------------------------------------------------------------------------
// excerpt
// ---------------------------------------------------------------------------

describe('excerpt', () => {
	const makeNote = (type: string, body: string): Note => ({
		body,
		meta: {
			type, id: 'x', title: 'T', status: 'active', tags: [], created: '2024-01-01', updated: '2024-01-01',
		},
		path: '/tmp/x.md',
	});

	test('returns first paragraph from the primary section', () => {
		const note = makeNote('note', '## Summary\n\nThis is the summary paragraph.\n\n## Details\n\nMore here.\n');
		expect(excerpt(note)).toBe('This is the summary paragraph.');
	});

	test('truncates at maxChars and appends ellipsis', () => {
		const long = 'a'.repeat(200);
		// Needs a trailing section so the regex anchor fires; real notes always have ## Details etc.
		const note = makeNote('note', `## Summary\n\n${long}\n\n## Details\n\nmore\n`);
		const result = excerpt(note, 20);
		expect(result.length).toBe(20);
		expect(result.endsWith('...')).toBe(true);
	});

	test('returns empty string for unknown type', () => {
		const note = makeNote('unknown', '## Summary\n\nSome text.\n');
		expect(excerpt(note)).toBe('');
	});

	test('skips list items and finds first prose paragraph', () => {
		const note = makeNote('note', '## Summary\n\n- item one\n- item two\n\nProse paragraph.\n\n## Details\n\nmore\n');
		expect(excerpt(note)).toBe('Prose paragraph.');
	});

	test('returns empty string when primary section has no prose', () => {
		const note = makeNote('note', '## Summary\n\n- only a list\n\n## Details\n\nSomething.\n');
		expect(excerpt(note)).toBe('');
	});
});

// ---------------------------------------------------------------------------
// TYPE_DIRS (spot check that the schema is intact)
// ---------------------------------------------------------------------------

describe('TYPE_DIRS', () => {
	test('contains all five canonical types', () => {
		expect(Object.keys(TYPE_DIRS).toSorted()).toEqual(['decision', 'index', 'note', 'question', 'source']);
	});
});

