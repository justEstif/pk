// Node:fs used only for path operations; file reads use Bun.file()
import path from 'node:path';
import matter from 'gray-matter';
import {z} from 'zod';
import {
	REQUIRED_SECTIONS, STATUSES, TYPE_DIRS, LENGTH_WARN, type Note,
} from './schema.ts';
import {allNotes} from './notes.ts';

export type IssueLevel = 'error' | 'warn';
export type Issue = {level: IssueLevel; message: string; path: string};

function issue(level: IssueLevel, message: string, p: string): Issue {
	return {level, message, path: p};
}

// ---------------------------------------------------------------------------
// Frontmatter schema (shape + status-per-type validation)
// ---------------------------------------------------------------------------

function missing(field: string): string {
	return `missing frontmatter field: ${field}`;
}

// Gray-matter/js-yaml parses ISO date values (e.g. 2024-01-01) as Date objects.
// Coerce them to ISO strings so z.string() validators work correctly.
function coerceDate(val: unknown): unknown {
	return val instanceof Date ? val.toISOString().slice(0, 10) : val;
}

const frontmatterSchema = z.object({
	id: z.string({error: missing('id')})
		.min(1, missing('id')),
	type: z.string({error: missing('type')})
		.min(1, missing('type')),
	title: z.string({error: missing('title')})
		.min(1, missing('title')),
	created: z.preprocess(coerceDate, z.string({error: missing('created')}).min(1, missing('created'))),
	updated: z.preprocess(coerceDate, z.string({error: missing('updated')}).min(1, missing('updated'))),
	status: z.string({error: missing('status')})
		.min(1, missing('status')),
	tags: z.array(z.string(), {error: 'tags must be a flat list'}),
}).loose().superRefine((data, ctx) => {
	if (data.type && !TYPE_DIRS[data.type]) {
		ctx.addIssue({
			code: 'custom',
			path: ['type'],
			message: `invalid type: ${data.type}`,
		});
	}

	if (data.type && STATUSES[data.type] && !STATUSES[data.type]!.includes(data.status)) {
		ctx.addIssue({
			code: 'custom',
			path: ['status'],
			message: `invalid status '${data.status}' for type ${data.type}`,
		});
	}
});

// ---------------------------------------------------------------------------
// Per-note checks
// ---------------------------------------------------------------------------

function checkFrontmatter(
	meta: Record<string, unknown>,
	p: string,
	knowledgeDir: string,
): Issue[] {
	const result = frontmatterSchema.safeParse(meta);
	const issues: Issue[] = [];

	if (!result.success) {
		for (const zi of result.error.issues) {
			issues.push(issue('error', zi.message, p));
		}

		// If type is unknown we can't validate location — bail early
		return issues;
	}

	// Empty tags: valid shape but worth a warning
	if (result.data.tags.length === 0) {
		issues.push(issue('warn', 'tags is empty', p));
	}

	// Location check: type is guaranteed valid here
	const {type} = result.data;
	const expected = path.resolve(knowledgeDir, TYPE_DIRS[type]!);
	if (path.resolve(path.dirname(p)) !== expected) {
		issues.push(issue('error', `${type} must live in ${expected}/`, p));
	}

	return issues;
}

function checkRequiredSections(body: string, type: string, p: string): Issue[] {
	const sections = new Set([...body.matchAll(/^## (.+?)\s*$/gmv)].map(m => m[1]));
	return (REQUIRED_SECTIONS[type] ?? []).flatMap(req =>
		sections.has(req) ? [] : [issue('error', `missing section: ## ${req}`, p)]);
}

async function checkLength(p: string, type: string): Promise<Issue[]> {
	const out: Issue[] = [];
	const text = await Bun.file(p).text();
	const lineCount = text.split('\n').length;
	const warnT = LENGTH_WARN[type];
	if (warnT && lineCount > warnT) {
		out.push(issue('warn', `${lineCount} lines exceeds ${type} threshold (${warnT})`, p));
	}

	if (type !== 'source' && lineCount > 400) {
		out.push(issue('error', 'non-source note exceeds 400 lines', p));
	}

	return out;
}

function checkSourceExtracted(body: string, meta: Record<string, unknown>, p: string): Issue[] {
	if (meta.type !== 'source' || meta.status !== 'processed') {
		return [];
	}

	const m = /^## Extracted Items\s*\n([\s\S]*?)(?=^##\s|$)/mv.exec(body);
	if (m && !m[1]?.trim()) {
		return [issue('warn', 'processed source has empty Extracted Items', p)];
	}

	return [];
}

// ---------------------------------------------------------------------------
// Cross-note check: duplicate ids
// ---------------------------------------------------------------------------

function checkUniqueIds(notes: Note[]): Issue[] {
	const ids = new Map<string, string>();
	const issues: Issue[] = [];
	for (const n of notes) {
		const id = (n.meta.id ?? '');
		if (!id) {
			continue;
		}

		if (ids.has(id)) {
			issues.push(issue('error', `duplicate id ${id} (also in ${ids.get(id)})`, n.path));
		} else {
			ids.set(id, n.path);
		}
	}

	return issues;
}

// ---------------------------------------------------------------------------
// Per-note validation — runs all checks for a single note
// ---------------------------------------------------------------------------

async function runPerNoteChecks(note: Note, knowledgeDir: string): Promise<Issue[]> {
	const p = note.path;
	if (note.err) {
		return [issue('error', `parse error: ${note.err}`, p)];
	}

	const result: Issue[] = [...checkFrontmatter(note.meta, p, knowledgeDir)];

	// If type is unknown skip structural checks that depend on it
	const type = note.meta.type ?? '';
	if (!TYPE_DIRS[type]) {
		return result;
	}

	const lengthIssues = await checkLength(p, type);
	return [
		...result,
		...checkRequiredSections(note.body, type, p),
		...checkSourceExtracted(note.body, note.meta, p),
		...lengthIssues,
	];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a single note by path. Reads the file directly (does not load all notes).
 * Runs per-note checks only — no cross-note checks (use lintNotes for project-wide lint).
 */
export async function validateNote(notePath: string, knowledgeDir: string): Promise<Issue[]> {
	const file = Bun.file(notePath);
	if (!await file.exists()) {
		return [issue('error', `file not found: ${notePath}`, notePath)];
	}

	const text = await file.text();
	let note: Note;
	try {
		const {data, content} = matter(text);
		note = {body: content, meta: data, path: notePath};
	} catch (error) {
		note = {
			body: '',
			err: error instanceof Error ? error.message : String(error),
			meta: {},
			path: notePath,
		};
	}

	return runPerNoteChecks(note, knowledgeDir);
}

/**
 * Lint all or specific notes in a knowledge directory.
 * Runs per-note checks + cross-note checks (duplicate ids).
 *
 * @param knowledgeDir - Root knowledge directory
 * @param paths - Optional array of note paths to lint. Empty/absent = all notes.
 */
export async function lintNotes(knowledgeDir: string, paths?: string[]): Promise<{issues: Issue[]; noteCount: number}> {
	const all = await allNotes(knowledgeDir);

	// Filter to requested paths if provided and non-empty
	const notes = paths?.length
		? all.filter(n => paths.includes(n.path))
		: all;

	const perNoteIssues = await Promise.all(notes.map(async n => runPerNoteChecks(n, knowledgeDir)));

	// Cross-note checks always fire on the full note set (duplicate ids are project-wide)
	const issues: Issue[] = [
		...perNoteIssues.flat(),
		...checkUniqueIds(all.filter(n => !n.err)),
	];

	return {issues, noteCount: notes.length};
}
