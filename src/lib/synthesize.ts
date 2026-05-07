import {search} from './db.ts';
import {allNotes, validNotes} from './notes.ts';
import type {Note} from './schema.ts';

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
