import {
	existsSync, readdirSync, readFileSync, statSync,
} from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type {Note, NoteMeta} from './schema.ts';

// Re-export schema so callers that previously imported everything from
// notes.ts keep working without modification.
export type {Note, NoteMeta} from './schema.ts';
export {
	LENGTH_WARN, REQUIRED_SECTIONS, STATUSES, TYPE_DIRS,
} from './schema.ts';

const PRIMARY_SECTION: Record<string, string> = {
	decision: 'Decision',
	index: 'Purpose',
	note: 'Summary',
	question: 'Question',
	source: 'Source',
};

function walkMd(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}

	const results: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) {
			results.push(...walkMd(full));
		} else if (entry.endsWith('.md')) {
			results.push(full);
		}
	}

	return results.toSorted();
}

export function allNotes(knowledgeDir: string): Note[] {
	return walkMd(knowledgeDir).map(p => {
		const text = readFileSync(p, 'utf8');
		try {
			const {data, content} = matter(text);
			return {body: content, meta: data, path: p};
		} catch (error) {
			return {
				body: '',
				err: error instanceof Error ? error.message : String(error),
				meta: {},
				path: p,
			};
		}
	});
}

export function validNotes(knowledgeDir: string, excludeTypes: string[] = []): Note[] {
	return allNotes(knowledgeDir).filter(n => !n.err && !excludeTypes.includes(n.meta.type ?? ''));
}

export function excerpt(note: Note, maxChars = 140): string {
	const section = PRIMARY_SECTION[note.meta.type ?? ''];
	if (!section) {
		return '';
	}

	const re = new RegExp(String.raw`(?:^|\n)## ${section}[ \t]*\n([\s\S]*?)(?=\n## |$)`, 'v');
	const m = note.body.match(re);
	if (!m?.[1]) {
		return '';
	}

	for (const para of m[1].split('\n\n')) {
		const p = para.trim();
		if (!p || p.startsWith('#') || p.startsWith('-') || p.startsWith('*')) {
			continue;
		}

		return p.length > maxChars ? p.slice(0, maxChars - 3) + '...' : p;
	}

	return '';
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replaceAll(/[^a-z\d]+/gv, '-')
		.replaceAll(/^-|-$/gv, '');
}
