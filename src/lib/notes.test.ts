import {describe, expect, test} from 'bun:test';
import {
	type Note, type NoteMeta, parseFrontmatter, slugify, excerpt, TYPE_DIRS,
} from './notes.ts';

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
	test('parses valid frontmatter and body', () => {
		const input = `---
id: abc-123
title: My Note
type: note
status: active
tags: [foo, bar]
created: 2024-01-01
updated: 2024-01-02
---
Body content here.
`;
		const result: {body: string; meta: NoteMeta} | {err: string} = parseFrontmatter(input);
		expect('err' in result).toBe(false);
		if ('err' in result) {
			return;
		}

		expect(result.meta.id).toBe('abc-123');
		expect(result.meta.title).toBe('My Note');
		expect(result.meta.type).toBe('note');
		expect(result.meta.status).toBe('active');
		expect(result.meta.tags).toEqual(['foo', 'bar']);
		expect(result.body.trim()).toBe('Body content here.');
	});

	test('parses empty tags list', () => {
		const input = `---
id: x
title: T
type: note
status: active
tags: []
created: 2024-01-01
updated: 2024-01-01
---
`;
		const result = parseFrontmatter(input);
		expect('err' in result).toBe(false);
		if ('err' in result) {
			return;
		}

		expect(result.meta.tags).toEqual([]);
	});

	test('returns error when opening delimiter is missing', () => {
		const result = parseFrontmatter('no frontmatter here');
		expect('err' in result).toBe(true);
	});

	test('returns error when closing delimiter is missing', () => {
		const result = parseFrontmatter('---\nid: x\n');
		expect('err' in result).toBe(true);
	});

	test('returns error on invalid frontmatter line', () => {
		const result = parseFrontmatter('---\nbadline\n---\n');
		expect('err' in result).toBe(true);
	});

	test('strips surrounding quotes from values', () => {
		const input = `---
id: "quoted-id"
title: 'single-quoted'
type: note
status: active
tags: []
created: 2024-01-01
updated: 2024-01-01
---
`;
		const result = parseFrontmatter(input);
		expect('err' in result).toBe(false);
		if ('err' in result) {
			return;
		}

		expect(result.meta.id).toBe('quoted-id');
		expect(result.meta.title).toBe('single-quoted');
	});
});

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
