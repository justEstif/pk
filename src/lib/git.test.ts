import {mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {
	describe, test, expect, beforeEach, afterEach,
} from 'bun:test';
import {$} from 'bun';
import {
	parseCommitMessage, extractTitleFromPath, formatHistory, writeEvent, parseEventNote, getHistory, type HistoryEntry,
} from './git.ts';

async function setupGitRepo(): Promise<string> {
	const dir = path.join(tmpdir(), `pk-event-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
	mkdirSync(dir, {recursive: true});
	await $`git -C ${dir} init`.quiet();
	await $`git -C ${dir} config user.name "pk"`.quiet();
	await $`git -C ${dir} config user.email "pk@local"`.quiet();
	await $`git -C ${dir} config commit.gpgsign false`.quiet();
	await Bun.write(path.join(dir, '.gitignore'), '*.db\n');
	await $`git -C ${dir} add .`.quiet();
	await $`git -C ${dir} commit -m "pk: init"`.quiet();
	return dir;
}

describe('parseCommitMessage', () => {
	test('parses valid create commit', () => {
		const result = parseCommitMessage('knowledge: intake note my-title');
		expect(result?.operation).toBe('intake');
		expect(result?.noteType).toBe('note');
		expect(result?.title).toBe('my-title');
	});

	test('parses valid update commit', () => {
		const result = parseCommitMessage('knowledge: update decision authentication-flow');
		expect(result?.operation).toBe('update');
		expect(result?.noteType).toBe('decision');
		expect(result?.title).toBe('authentication-flow');
	});

	test('parses valid delete commit', () => {
		const result = parseCommitMessage('knowledge: delete question api-timeout');
		expect(result?.operation).toBe('delete');
		expect(result?.noteType).toBe('question');
		expect(result?.title).toBe('api-timeout');
	});

	test('returns undefined for invalid format', () => {
		expect(parseCommitMessage('fix: bug')).toBeUndefined();
		expect(parseCommitMessage('knowledge: invalid')).toBeUndefined();
		expect(parseCommitMessage('random message')).toBeUndefined();
	});
});

describe('extractTitleFromPath', () => {
	test('extracts title from note path with date prefix', () => {
		const title = extractTitleFromPath('/home/user/.pk/project/notes/2026-05-08-my-title.md');
		expect(title).toBe('my-title');
	});

	test('extracts multi-word title', () => {
		const title = extractTitleFromPath('/home/user/.pk/project/notes/2026-05-08-my-great-title.md');
		expect(title).toBe('my-great-title');
	});

	test('handles path without date prefix', () => {
		const title = extractTitleFromPath('/home/user/.pk/project/notes/simple-title.md');
		expect(title).toBe('simple-title');
	});

	test('handles path with insufficient parts', () => {
		const title = extractTitleFromPath('/home/user/.pk/project/notes/2026-05-08.md');
		expect(title).toBe('2026-05-08');
	});
});

describe('writeEvent', () => {
	let repoDir: string;

	beforeEach(async () => {
		repoDir = await setupGitRepo();
	});

	afterEach(() => {
		rmSync(repoDir, {recursive: true, force: true});
	});

	test('creates a git note on HEAD with event tag', async () => {
		await writeEvent(repoDir, 'session-open');
		const result = await $`git -C ${repoDir} notes show`.quiet();
		const note = result.stdout.toString();
		expect(note).toContain('pk event:session-open');
		expect(note).toContain('Timestamp:');
	});

	test('writes metadata as key-value pairs', async () => {
		await writeEvent(repoDir, 'search', {query: 'auth', results: '3'});
		const result = await $`git -C ${repoDir} notes show`.quiet();
		const note = result.stdout.toString();
		expect(note).toContain('query: auth');
		expect(note).toContain('results: 3');
	});

	test('does not create a commit', async () => {
		const before = await $`git -C ${repoDir} log --oneline`.quiet();
		const countBefore = before.stdout.toString().trim().split('\n').length;
		await writeEvent(repoDir, 'session-open');
		const after = await $`git -C ${repoDir} log --oneline`.quiet();
		const countAfter = after.stdout.toString().trim().split('\n').length;
		expect(countAfter).toBe(countBefore);
	});

	test('appends multiple events to the same commit', async () => {
		await writeEvent(repoDir, 'session-open');
		await writeEvent(repoDir, 'search', {query: 'auth', results: '3'});
		const result = await $`git -C ${repoDir} notes show`.quiet();
		const note = result.stdout.toString();
		expect(note).toContain('pk event:session-open');
		expect(note).toContain('pk event:search');
	});
});

describe('parseEventNote', () => {
	test('parses event note with tag and metadata', () => {
		const result = parseEventNote('pk event:search\nquery: auth\nresults: 3\nTimestamp: 2026-05-09T12:00:00Z');
		expect(result?.tag).toBe('search');
		expect(result?.meta.query).toBe('auth');
		expect(result?.meta.results).toBe('3');
		expect(result?.meta.Timestamp).toBe('2026-05-09T12:00:00Z');
	});

	test('parses event note with tag only', () => {
		const result = parseEventNote('pk event:session-open\nTimestamp: 2026-05-09T12:00:00Z');
		expect(result?.tag).toBe('session-open');
	});

	test('returns undefined for non-event notes', () => {
		expect(parseEventNote('pk synthesize\nQuery: test')).toBeUndefined();
		expect(parseEventNote('random message')).toBeUndefined();
	});
});

describe('formatHistory', () => {
	test('getHistory returns events interleaved with commits', async () => {
		const repoDir = await setupGitRepo();
		try {
			// Write an event before any knowledge commit
			await writeEvent(repoDir, 'session-open');

			// Create a knowledge file to generate a commit
			const notesDir = path.join(repoDir, 'notes');
			mkdirSync(notesDir, {recursive: true});
			await Bun.write(path.join(notesDir, '2026-05-09-test.md'), '---\ntype: note\n---\n\n## Summary\n\nTest.');
			await $`git -C ${repoDir} add .`.quiet();
			await $`git -C ${repoDir} commit -m "knowledge: intake note test"`.quiet();

			// Write an event after the commit
			await writeEvent(repoDir, 'search', {query: 'auth', results: '3'});

			const entries = await getHistory(repoDir, {limit: 10, type: 'all'});

			// Should have commit + event entries
			const commitEntries = entries.filter(e => e.type === 'commit');
			const eventEntries = entries.filter(e => e.tag !== undefined);
			expect(commitEntries.length).toBeGreaterThanOrEqual(1);
			expect(eventEntries.length).toBeGreaterThanOrEqual(2); // Session-open + search

			// Events should have tags and meta
			const searchEvent = eventEntries.find(e => e.tag === 'search');
			expect(searchEvent).toBeDefined();
			expect(searchEvent?.meta?.query).toBe('auth');
			expect(searchEvent?.meta?.results).toBe('3');
		} finally {
			rmSync(repoDir, {recursive: true, force: true});
		}
	});
});

describe('formatHistory standalone', () => {
	test('formats commit entries', () => {
		const entries: HistoryEntry[] = [
			{
				hash: 'abc123',
				timestamp: '2026-05-08T12:00:00',
				message: 'knowledge: intake note test',
				type: 'commit',
				operation: 'intake',
				noteType: 'note',
			},
		];

		const result = formatHistory(entries);
		expect(result).toContain('abc123');
		expect(result).toContain('intake note');
		expect(result).toContain('test');
	});

	test('formats note entries', () => {
		const entries: HistoryEntry[] = [
			{
				hash: 'def456',
				timestamp: '2026-05-08T12:00:00',
				message: 'pk synthesize\nQuery: test',
				type: 'note',
			},
		];

		const result = formatHistory(entries);
		expect(result).toContain('def456');
		expect(result).toContain('📋');
		expect(result).toContain('pk synthesize');
	});

	test('formats event entries', () => {
		const entries: HistoryEntry[] = [
			{
				hash: 'abc123',
				timestamp: '2026-05-09T10:02:00Z',
				message: 'pk event:search\nquery: auth\nresults: 3\nTimestamp: 2026-05-09T10:02:00Z',
				type: 'note',
				tag: 'search',
				meta: {query: 'auth', results: '3', Timestamp: '2026-05-09T10:02:00Z'},
			},
		];

		const result = formatHistory(entries);
		expect(result).toContain('🔍');
		expect(result).toContain('search');
		expect(result).toContain('auth');
	});

	test('formats mixed entries', () => {
		const entries: HistoryEntry[] = [
			{
				hash: 'abc123',
				timestamp: '2026-05-08T12:00:00',
				message: 'knowledge: intake note test',
				type: 'commit',
				operation: 'intake',
				noteType: 'note',
			},
			{
				hash: 'def456',
				timestamp: '2026-05-08T12:01:00',
				message: 'pk synthesize\nQuery: test',
				type: 'note',
			},
		];

		const result = formatHistory(entries);
		const lines = result.split('\n');
		expect(lines).toHaveLength(2);
		expect(lines[0]).toContain('intake note');
		expect(lines[1]).toContain('📋');
	});
});
