import {describe, expect, test} from 'bun:test';
import type {Note} from './schema.ts';
import {formatSynthesizeOutput} from './synthesize.ts';

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
});
