import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
	beforeEach, afterEach, describe, expect, test,
} from 'bun:test';
import {
	search, rebuild, vocab, semanticSearch, hasVectors, hybridSearch, upsertVector,
} from './db.ts';
import type {EmbeddingProvider} from './embedding.ts';

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

describe('semanticSearch', () => {
	const TMP2 = path.join(os.tmpdir(), `pk-vec-test-${Date.now()}`);
	const VEC_DIR = path.join(TMP2, 'knowledge');

	beforeEach(() => {
		mkdirSync(path.join(VEC_DIR, 'notes'), {recursive: true});
	});

	afterEach(() => {
		rmSync(TMP2, {recursive: true, force: true});
	});

	test('hasVectors returns false before indexing', () => {
		expect(hasVectors(VEC_DIR)).toBe(false);
	});

	test('stores and retrieves vectors, ranks by cosine similarity', async () => {
		await writeNote(path.join(VEC_DIR, 'notes'), '2026-01-01-a.md', {id: 'vec-a', title: 'Alpha'});
		await writeNote(path.join(VEC_DIR, 'notes'), '2026-01-02-b.md', {id: 'vec-b', title: 'Beta'});

		const fakeProvider: EmbeddingProvider = {
			async embed(texts) {
				return texts.map((_, i) => i === 0 ? [1, 0] : [0, 1]);
			},
		};

		await rebuild(VEC_DIR, fakeProvider);
		expect(hasVectors(VEC_DIR)).toBe(true);

		// Vec-a=[1,0], vec-b=[0,1]; query [1,0] should rank vec-a first
		const results = await semanticSearch(VEC_DIR, [1, 0], 10);
		expect(results[0]?.id).toBe('vec-a');
		expect(results[1]?.id).toBe('vec-b');
		expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
	});
});

describe('hybridSearch', () => {
	const TMP3 = path.join(os.tmpdir(), `pk-hybrid-test-${Date.now()}`);
	const HYB_DIR = path.join(TMP3, 'knowledge');

	beforeEach(() => {
		mkdirSync(path.join(HYB_DIR, 'notes'), {recursive: true});
		mkdirSync(path.join(HYB_DIR, 'decisions'), {recursive: true});
		mkdirSync(path.join(HYB_DIR, 'questions'), {recursive: true});
		mkdirSync(path.join(HYB_DIR, 'sources'), {recursive: true});
		mkdirSync(path.join(HYB_DIR, 'indexes'), {recursive: true});
	});

	afterEach(() => {
		rmSync(TMP3, {recursive: true, force: true});
	});

	test('promotes note that ranks high in both retrievers', async () => {
		await writeNote(path.join(HYB_DIR, 'notes'), '2026-01-01-a.md', {id: 'hyb-a', title: 'Auth token design'});
		await writeNote(path.join(HYB_DIR, 'notes'), '2026-01-01-b.md', {id: 'hyb-b', title: 'Auth policy notes'});
		await writeNote(path.join(HYB_DIR, 'notes'), '2026-01-01-c.md', {id: 'hyb-c', title: 'Unrelated concept'});

		const fakeProvider: EmbeddingProvider = {
			async embed(texts) {
				return texts.map((_, i) => {
					if (i === 0) {
						return [1, 0];
					}

					if (i === 1) {
						return [0.3, 0.7];
					}

					return [0, 1];
				});
			},
		};

		await rebuild(HYB_DIR, fakeProvider);

		const results = await hybridSearch(HYB_DIR, 'auth', [1, 0], {limit: 3});
		const ids = results.map(r => r.id);
		expect(ids[0]).toBe('hyb-a'); // Appears in both keyword and semantic — must win
		expect(ids).toContain('hyb-c'); // Semantic-only hit must still surface
	});

	test('returns SearchResult shape with type, status, title, tags', async () => {
		await writeNote(path.join(HYB_DIR, 'notes'), '2026-01-01-a.md', {id: 'hyb-d', title: 'Shape test', tags: ['shape']});

		const fakeProvider: EmbeddingProvider = {
			async embed() {
				return [[1, 0]];
			},
		};

		await rebuild(HYB_DIR, fakeProvider);
		const results = await hybridSearch(HYB_DIR, 'shape', [1, 0], {limit: 5});
		expect(results.length).toBe(1);
		expect(results[0]!.id).toBe('hyb-d');
		expect(results[0]!.type).toBe('note');
		expect(Array.isArray(results[0]!.tags)).toBe(true);
	});

	test('respects limit', async () => {
		for (let i = 0; i < 5; i++) {
			await writeNote(path.join(HYB_DIR, 'notes'), `2026-01-0${i + 1}-n.md`, {id: `hyb-lim-${i}`, title: `Keyword match ${i}`}); // eslint-disable-line no-await-in-loop
		}

		const fakeProvider: EmbeddingProvider = {
			async embed(texts) {
				return texts.map((_, i) => [i, 0]);
			},
		};

		await rebuild(HYB_DIR, fakeProvider);
		const results = await hybridSearch(HYB_DIR, 'keyword', [1, 0], {limit: 2});
		expect(results.length).toBe(2);
	});
});

describe('upsertVector', () => {
	const TMP4 = path.join(os.tmpdir(), `pk-upsert-test-${Date.now()}`);
	const UP_DIR = path.join(TMP4, 'knowledge');

	beforeEach(() => {
		mkdirSync(path.join(UP_DIR, 'notes'), {recursive: true});
		mkdirSync(path.join(UP_DIR, 'indexes'), {recursive: true});
	});

	afterEach(() => {
		rmSync(TMP4, {recursive: true, force: true});
	});

	test('inserts a vector that is then retrievable via semanticSearch', async () => {
		const notePath = await writeNote(path.join(UP_DIR, 'notes'), '2026-01-01-upsert.md', {id: 'up-1', title: 'Upsert test'});
		await rebuild(UP_DIR); // Build FTS index without vectors
		expect(hasVectors(UP_DIR)).toBe(false);

		await upsertVector(UP_DIR, 'up-1', notePath, [1, 0]);
		expect(hasVectors(UP_DIR)).toBe(true);

		const results = await semanticSearch(UP_DIR, [1, 0], 5);
		expect(results[0]?.id).toBe('up-1');
	});

	test('replaces an existing vector on second upsert', async () => {
		const notePath = await writeNote(path.join(UP_DIR, 'notes'), '2026-01-01-replace.md', {id: 'up-2', title: 'Replace test'});
		await rebuild(UP_DIR);

		await upsertVector(UP_DIR, 'up-2', notePath, [1, 0]);
		await upsertVector(UP_DIR, 'up-2', notePath, [0, 1]);

		const results = await semanticSearch(UP_DIR, [0, 1], 5);
		expect(results[0]?.id).toBe('up-2');
		expect(results[0]!.score).toBeCloseTo(1); // Identical vectors → score ≈ 1
	});
});
