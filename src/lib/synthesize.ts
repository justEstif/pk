import {search} from './db.ts';
import {allNotes, excerpt, validNotes} from './notes.ts';
import type {Note} from './schema.ts';

/**
 * Format notes into a markdown context block suitable for agent injection.
 * Returns the full string (caller decides whether to print or return via MCP).
 */
export function formatSynthesizeOutput(notes: Note[], label: string): string {
	const today = new Date().toISOString().slice(0, 10);
	const lines: string[] = [`# Knowledge: ${label} (${notes.length} notes · ${today})`];
	for (const n of notes) {
		const tags = (n.meta.tags ?? []).join(', ');
		lines.push(`\n---\n### [${n.meta.title ?? '(untitled)'}] · ${n.meta.type} · ${n.meta.status}\n\`${n.path}\`${tags ? '\n**tags:** ' + tags : ''}\n`);
		const ex = excerpt(n);
		if (ex) {
			lines.push(ex);
		}
	}

	return lines.join('\n');
}

export type SynthesizeOptions = {
	all?: boolean;
	limit: number;
	sessionStart?: boolean;
	tag?: string;
	type?: string;
};

/**
 * Select notes for a synthesize run.
 * Throws Error on invalid input (no query and no mode flag) or search failure.
 */
export function selectNotes(
	knowledgeDir: string,
	query: string | undefined,
	opts: SynthesizeOptions,
): Note[] {
	const {limit, sessionStart, all, tag, type} = opts;

	if (sessionStart) {
		const notes = validNotes(knowledgeDir, ['index', 'source']);
		return notes
			.filter(n => n.meta.status === 'open' || n.meta.status === 'accepted' || n.meta.status === 'active')
			.slice(0, limit);
	}

	if (all) {
		return validNotes(knowledgeDir, ['index']).slice(0, limit);
	}

	if (query) {
		const results = search(knowledgeDir, query, {filterTag: tag, filterType: type, limit});
		const byPath = new Map(allNotes(knowledgeDir).map(n => [n.path, n]));
		return results.map(r => byPath.get(r.path)).filter((n): n is Note => n !== undefined);
	}

	throw new Error('Provide a query or --all');
}
