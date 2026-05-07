import {
	existsSync, readdirSync, readFileSync, statSync,
} from 'node:fs';
import path from 'node:path';

export const TYPE_DIRS: Record<string, string> = {
	decision: 'decisions',
	index: 'indexes',
	note: 'notes',
	question: 'questions',
	source: 'sources',
};

export const STATUSES: Record<string, string[]> = {
	decision: ['proposed', 'accepted', 'superseded'],
	index: ['active', 'archived'],
	note: ['active', 'superseded', 'archived'],
	question: ['open', 'answered', 'obsolete'],
	source: ['unprocessed', 'processed', 'archived'],
};

export const REQUIRED_SECTIONS: Record<string, string[]> = {
	decision: ['Decision', 'Context', 'Rationale', 'Consequences', 'Related'],
	index: ['Purpose', 'Key Links', 'Open Questions', 'Recent Changes'],
	note: ['Summary', 'Details', 'Evidence', 'Related'],
	question: ['Question', 'Why It Matters', 'Current Understanding', 'Resolution'],
	source: ['Source', 'Raw Material', 'Extracted Items'],
};

export const LENGTH_WARN: Record<string, number> = {
	decision: 120,
	index: 200,
	note: 150,
	question: 80,
	source: 400,
};

const PRIMARY_SECTION: Record<string, string> = {
	decision: 'Decision',
	index: 'Purpose',
	note: 'Summary',
	question: 'Question',
	source: 'Source',
};

export type NoteMeta = {
	[key: string]: string | string[] | undefined;
	created?: string;
	id?: string;
	status?: string;
	tags?: string[];
	title?: string;
	type?: string;
	updated?: string;
};

export type Note = {
	body: string;
	err?: string;
	meta: NoteMeta;
	path: string;
};

export function parseFrontmatter(text: string): {body: string; meta: NoteMeta} | {err: string} {
	if (!text.startsWith('---\n')) {
		return {err: 'missing opening frontmatter delimiter'};
	}

	const end = text.indexOf('\n---\n', 4);
	if (end === -1) {
		return {err: 'missing closing frontmatter delimiter'};
	}

	const raw = text.slice(4, end);
	const body = text.slice(end + 5);
	const meta: NoteMeta = {};

	for (const line of raw.split('\n')) {
		const trimmed = line.trimEnd();
		if (!trimmed.trim()) {
			continue;
		}

		const colon = trimmed.indexOf(':');
		if (colon === -1) {
			return {err: `invalid frontmatter line: ${JSON.stringify(trimmed)}`};
		}

		const key = trimmed.slice(0, colon).trim();
		const val = trimmed.slice(colon + 1).trim();
		if (val.startsWith('[') && val.endsWith(']')) {
			const inner = val.slice(1, -1).trim();
			meta[key] = inner
				? inner.split(',').map(p => p.trim().replaceAll(/^['"]|['"]$/gv, ''))
				: [];
		} else {
			meta[key] = val.replaceAll(/^['"]|['"]$/gv, '');
		}
	}

	return {body, meta};
}

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
		const result = parseFrontmatter(text);
		if ('err' in result) {
			return {
				body: '', err: result.err, meta: {}, path: p,
			};
		}

		return {...result, path: p};
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
