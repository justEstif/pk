import {describe, expect, test} from 'bun:test';
import {renderTemplate} from './templates.ts';

const VARS = {
	title: 'My Note', date: '2024-01-01', slug: 'my-note', tags: 'engineering',
};

describe('renderTemplate', () => {
	test('substitutes title, date, slug, and tags into the template', () => {
		const result = renderTemplate('note', VARS);
		expect(result).toContain('title: My Note');
		expect(result).toContain('id: note-2024-01-01-my-note');
		expect(result).toContain('created: 2024-01-01');
		expect(result).toContain('tags: [engineering]');
	});

	test('rendered output starts with frontmatter delimiter', () => {
		const result = renderTemplate('note', VARS);
		expect(result.startsWith('---')).toBe(true);
	});

	test('includes all required sections for the note type', () => {
		const result = renderTemplate('note', VARS);
		expect(result).toContain('## Summary');
		expect(result).toContain('## Details');
		expect(result).toContain('## Evidence');
		expect(result).toContain('## Related');
	});

	test('renders a question template with correct status and sections', () => {
		const result = renderTemplate('question', {...VARS, title: 'Why?'});
		expect(result).toContain('status: open');
		expect(result).toContain('## Question');
		expect(result).toContain('## Resolution');
	});

	test('renders a decision template with correct status', () => {
		const result = renderTemplate('decision', VARS);
		expect(result).toContain('status: accepted');
		expect(result).toContain('## Decision');
		expect(result).toContain('## Rationale');
	});

	test('renders a source template with unprocessed status', () => {
		const result = renderTemplate('source', VARS);
		expect(result).toContain('status: unprocessed');
		expect(result).toContain('## Extracted Items');
	});

	test('renders an index template with correct status and sections', () => {
		const result = renderTemplate('index', VARS);
		expect(result).toContain('status: active');
		expect(result).toContain('id: index-2024-01-01-my-note');
		expect(result).toContain('## Purpose');
		expect(result).toContain('## Key Links');
		expect(result).toContain('## Open Questions');
		expect(result).toContain('## Recent Changes');
	});

	test('throws for an unknown type', () => {
		expect(() => renderTemplate('unknown_type', {})).toThrow('Unknown note type');
	});

	test('leaves unreferenced placeholders intact', () => {
		// Passing no vars → all {{placeholders}} remain unreplaced
		const result = renderTemplate('note', {});
		expect(result).toContain('{{title}}');
		expect(result).toContain('{{date}}');
	});
});
