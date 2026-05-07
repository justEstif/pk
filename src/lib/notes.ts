import {
	existsSync, readdirSync, readFileSync, statSync,
} from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

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
