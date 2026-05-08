import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
	beforeEach, afterEach, describe, expect, test,
} from 'bun:test';
import {search, rebuild, vocab} from './db.ts';

const TMP = path.join(os.tmpdir(), `pk-db-test-${Date.now()}`);
const KNOWLEDGE_DIR = path.join(TMP, 'knowledge');

function noteFrontmatter(overrides: Record<string, unknown> = {}): string {
	const defaults = {
		id: 'test-id',
		type: 'note',
		title: 'Test Note',
		created: '2026-05-08',
		updated: '2026-05-08',
		status: 'active',
		tags: ['test'],
	};
	const meta = {...defaults, ...overrides};
	const lines = Object.entries(meta)
		.map(([k, v]) => {
			if (Array.isArray(v)) {
				return `${k}:\n${v.map((t: string) => `  - ${t}`).join('\n')}`;
			}

			return `${k}: ${v}`;
		});
	return `---\n${lines.join('\n')}\n---`;
}

const DEFAULT_BODY = '\n\n## Summary\n\nTest content.\n\n## Details\n\nDetails here.\n\n## Evidence\n\nNone.\n\n## Related\n\nNone.\n';

async function writeNote(dir: string, filename: string, overrides: Record<string, unknown> = {}, body?: string): Promise<string> {
	const p = path.join(dir, filename);
	await Bun.write(p, noteFrontmatter(overrides) + (body ?? DEFAULT_BODY));
	return p;
}

describe('db', () => {
	beforeEach(() => {
		mkdirSync(path.join(KNOWLEDGE_DIR, 'notes'), {recursive: true});
		mkdirSync(path.join(KNOWLEDGE_DIR, 'decisions'), {recursive: true});
		mkdirSync(path.join(KNOWLEDGE_DIR, 'questions'), {recursive: true});
		mkdirSync(path.join(KNOWLEDGE_DIR, 'sources'), {recursive: true});
		mkdirSync(path.join(KNOWLEDGE_DIR, 'indexes'), {recursive: true});
	});

	afterEach(() => {
		rmSync(TMP, {recursive: true, force: true});
	});

	describe('rebuild', () => {
		test('returns 0 for empty knowledge directory', async () => {
			const count = await rebuild(KNOWLEDGE_DIR);
			expect(count).toBe(0);
		});

		test('indexes all valid notes', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-alpha.md', {id: 'n1', title: 'Alpha note'});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-beta.md', {id: 'n2', title: 'Beta note'});
			const count = await rebuild(KNOWLEDGE_DIR);
			expect(count).toBe(2);
		});

		test('excludes index type notes', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-regular.md', {id: 'n1', title: 'Regular'});
			await writeNote(path.join(KNOWLEDGE_DIR, 'indexes'), '2026-01-01-idx.md', {
				id: 'idx1', type: 'index', title: 'Index note', status: 'active',
			});
			const count = await rebuild(KNOWLEDGE_DIR);
			expect(count).toBe(1);
		});
	});

	describe('search', () => {
		test('throws when index does not exist', () => {
			expect(() => search(KNOWLEDGE_DIR, 'test')).toThrow('Search index not found');
		});

		test('finds notes by title', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-alpha.md', {
				id: 'n1', title: 'Database schema design', tags: ['db'],
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-beta.md', {
				id: 'n2', title: 'API authentication', tags: ['api'],
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'database');
			expect(results.length).toBe(1);
			expect(results[0]!.title).toBe('Database schema design');
		});

		test('finds notes by body content', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-note.md', {
				id: 'n1', title: 'Some title',
			}, '\n\n## Summary\n\nThe quick brown fox jumps.\n\n## Details\n\nDetails.\n\n## Evidence\n\nNone.\n\n## Related\n\nNone.\n');
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'fox');
			expect(results.length).toBe(1);
		});

		test('supports partial word matching via porter stemming', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-migration.md', {
				id: 'n1', title: 'Database migration plan',
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'migrat');
			expect(results.length).toBe(1);
		});

		test('supports multi-word AND queries', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-match.md', {
				id: 'n1', title: 'Auth token expiry',
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-nomatch.md', {
				id: 'n2', title: 'Auth only',
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'auth token');
			expect(results.length).toBe(1);
			expect(results[0]!.id).toBe('n1');
		});

		test('filters by type', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-note.md', {
				id: 'n1', title: 'Shared keyword note',
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'decisions'), '2026-01-01-decision.md', {
				id: 'd1', type: 'decision', title: 'Shared keyword decision', status: 'accepted',
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'keyword', {filterType: 'decision'});
			expect(results.length).toBe(1);
			expect(results[0]!.type).toBe('decision');
		});

		test('filters by status', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-active.md', {
				id: 'n1', title: 'Active item', status: 'active',
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-archived.md', {
				id: 'n2', title: 'Archived item', status: 'archived',
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'item', {filterStatus: 'active'});
			expect(results.length).toBe(1);
			expect(results[0]!.id).toBe('n1');
		});

		test('filters by tag', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-tagged.md', {
				id: 'n1', title: 'Tagged note', tags: ['important', 'core'],
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-untagged.md', {
				id: 'n2', title: 'Untagged note', tags: ['minor'],
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'note', {filterTag: 'important'});
			expect(results.length).toBe(1);
			expect(results[0]!.tags).toContain('important');
		});

		test('respects limit', async () => {
			const notes = Array.from({length: 5}, (_, i) => ({
				dir: path.join(KNOWLEDGE_DIR, 'notes'),
				file: `2026-01-01-note-${i}.md`,
				overrides: {id: `n${i}`, title: `Shared keyword ${i}`},
			}));
			await Promise.all(notes.map(async n => writeNote(n.dir, n.file, n.overrides)));

			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'keyword', {limit: 3});
			expect(results.length).toBe(3);
		});

		test('returns empty array when no matches', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-note.md', {
				id: 'n1', title: 'Unrelated content',
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'xyzzy-nothing-matches');
			expect(results.length).toBe(0);
		});

		test('returns snippet in results', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-note.md', {
				id: 'n1', title: 'Snippet test',
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'snippet');
			expect(results.length).toBe(1);
			expect(typeof results[0]!.snippet).toBe('string');
		});

		test('parses tags as array in results', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-note.md', {
				id: 'n1', title: 'Tag test', tags: ['a', 'b', 'c'],
			});
			await rebuild(KNOWLEDGE_DIR);
			const results = search(KNOWLEDGE_DIR, 'tag', {filterTag: 'a'});
			expect(results[0]!.tags).toEqual(['a', 'b', 'c']);
		});
	});

	describe('vocab', () => {
		test('throws when index does not exist', () => {
			expect(() => vocab(KNOWLEDGE_DIR)).toThrow('Search index not found');
		});

		test('returns tags sorted by frequency descending', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-a.md', {
				id: 'n1', title: 'Note A', tags: ['common', 'shared'],
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-b.md', {
				id: 'n2', title: 'Note B', tags: ['common', 'rare'],
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-c.md', {
				id: 'n3', title: 'Note C', tags: ['common'],
			});
			await rebuild(KNOWLEDGE_DIR);
			const tags = vocab(KNOWLEDGE_DIR);
			expect(tags[0]).toEqual({tag: 'common', count: 3});
		});

		test('breaks ties alphabetically', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-a.md', {
				id: 'n1', title: 'Note A', tags: ['beta'],
			});
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-b.md', {
				id: 'n2', title: 'Note B', tags: ['alpha'],
			});
			await rebuild(KNOWLEDGE_DIR);
			const tags = vocab(KNOWLEDGE_DIR);
			expect(tags.map(t => t.tag)).toEqual(['alpha', 'beta']);
		});

		test('returns empty array when no tags exist', async () => {
			await writeNote(path.join(KNOWLEDGE_DIR, 'notes'), '2026-01-01-note.md', {
				id: 'n1', title: 'No tags', tags: [],
			});
			await rebuild(KNOWLEDGE_DIR);
			const tags = vocab(KNOWLEDGE_DIR);
			expect(tags).toEqual([]);
		});
	});
});
