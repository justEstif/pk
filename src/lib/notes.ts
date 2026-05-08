import {mkdirSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {type Note, TYPE_DIRS} from './schema.ts';
import {renderTemplate} from './templates.ts';

const PRIMARY_SECTION: Record<string, string> = {
	decision: 'Decision',
	index: 'Purpose',
	note: 'Summary',
	question: 'Question',
	source: 'Source',
};

function walkMd(dir: string): string[] {
	try {
		if (!statSync(dir).isDirectory()) {
			return [];
		}
	} catch {
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

export async function allNotes(knowledgeDir: string): Promise<Note[]> {
	const files = walkMd(knowledgeDir);
	return Promise.all(files.map(async p => {
		const text = await Bun.file(p).text();
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
	}));
}

export async function validNotes(knowledgeDir: string, excludeTypes: string[] = []): Promise<Note[]> {
	const notes = await allNotes(knowledgeDir);
	return notes.filter(n => !n.err && !excludeTypes.includes(n.meta.type ?? ''));
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

/**
 * Creates a new knowledge note. Returns the path to the written file.
 * Rejects if the type is unknown or the file already exists.
 */
export async function createNote(
	knowledgeDir: string,
	type: string,
	title: string,
	tags: string,
): Promise<string> {
	if (!TYPE_DIRS[type]) {
		throw new Error(`Unknown type: ${type}. Valid: ${Object.keys(TYPE_DIRS).join(', ')}`);
	}

	const today = new Date().toISOString().slice(0, 10);
	const slug = slugify(title);
	const tagStr = tags
		.split(',')
		.map(t => t.trim())
		.filter(Boolean)
		.join(', ');

	const content = renderTemplate(type, {
		date: today, slug, tags: tagStr, title,
	});
	const noteDir = path.join(knowledgeDir, TYPE_DIRS[type]);
	mkdirSync(noteDir, {recursive: true});

	const outPath = path.join(noteDir, `${today}-${slug}.md`);
	const outFile = Bun.file(outPath);
	if (await outFile.exists()) {
		throw new Error(`Already exists: ${outPath}`);
	}

	await Bun.write(outPath, content);
	return outPath;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replaceAll(/[^a-z\d]+/gv, '-')
		.replaceAll(/^-|-$/gv, '');
}
