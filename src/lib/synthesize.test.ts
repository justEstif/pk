import {describe, expect, test} from 'bun:test';
import type {Note} from './schema.ts';
import {formatSynthesizeOutput} from './synthesize.ts';
import type {ParsedEvent} from './git.ts';

function makeNote(overrides: Partial<Note['meta']> = {}, body = ''): Note {
	return {
		body,
		meta: {
			id: 'abc123',
			status: 'open',
			title: 'Test Note',
			type: 'note',
			...overrides,
		},
		path: '/knowledge/notes/2024-01-01-test-note.md',
	};
}

describe('formatSynthesizeOutput', () => {
	test('includes header with label and count', () => {
		const notes = [makeNote()];
		const out = formatSynthesizeOutput(notes, 'my query');
		expect(out).toContain('# Knowledge: my query (1 notes ·');
	});

	test('includes note title, type, status, path', () => {
		const notes = [makeNote({title: 'Decision X', type: 'decision', status: 'accepted'})];
		const out = formatSynthesizeOutput(notes, 'all');
		expect(out).toContain('[Decision X]');
		expect(out).toContain('decision');
		expect(out).toContain('accepted');
		expect(out).toContain('/knowledge/notes/2024-01-01-test-note.md');
	});

	test('includes tags when present', () => {
		const notes = [makeNote({tags: ['infra', 'auth']})];
		const out = formatSynthesizeOutput(notes, 'all');
		expect(out).toContain('**tags:** infra, auth');
	});

	test('omits tags line when no tags', () => {
		const notes = [makeNote({tags: []})];
		const out = formatSynthesizeOutput(notes, 'all');
		expect(out).not.toContain('**tags:**');
	});

	test('handles untitled note', () => {
		const notes = [makeNote({title: undefined})];
		const out = formatSynthesizeOutput(notes, 'all');
		expect(out).toContain('(untitled)');
	});

	test('renders multiple notes', () => {
		const notes = [
			makeNote({title: 'A'}),
			makeNote({title: 'B'}),
		];
		const out = formatSynthesizeOutput(notes, 'all');
		expect(out).toContain('[A]');
		expect(out).toContain('[B]');
	});

	test('includes recent activity section when events provided', () => {
		const notes = [makeNote()];
		const events: ParsedEvent[] = [
			{tag: 'search', meta: {query: 'auth', results: '3', Timestamp: '2026-05-09T10:00:00Z'}},
			{tag: 'session-open', meta: {Timestamp: '2026-05-09T09:00:00Z'}},
		];
		const out = formatSynthesizeOutput(notes, 'session context', events);
		expect(out).toContain('## Recent activity');
		expect(out).toContain('search');
		expect(out).toContain('auth');
		expect(out).toContain('session-open');
	});

	test('omits recent activity section when no events', () => {
		const notes = [makeNote()];
		const out = formatSynthesizeOutput(notes, 'all');
		expect(out).not.toContain('## Recent activity');
	});

	test('omits recent activity section when events is empty', () => {
		const notes = [makeNote()];
		const out = formatSynthesizeOutput(notes, 'all', []);
		expect(out).not.toContain('## Recent activity');
	});
});
