import {readFileSync} from 'node:fs';
import path from 'node:path';
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

export function checkFrontmatter(
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

export function checkRequiredSections(body: string, type: string, p: string): Issue[] {
	const sections = new Set([...body.matchAll(/^## (.+?)\s*$/gmv)].map(m => m[1]));
	return (REQUIRED_SECTIONS[type] ?? []).flatMap(req =>
		sections.has(req) ? [] : [issue('error', `missing section: ## ${req}`, p)]);
}

export function checkLength(p: string, type: string): Issue[] {
	const out: Issue[] = [];
	const lineCount = readFileSync(p, 'utf8').split('\n').length;
	const warnT = LENGTH_WARN[type];
	if (warnT && lineCount > warnT) {
		out.push(issue('warn', `${lineCount} lines exceeds ${type} threshold (${warnT})`, p));
	}

	if (type !== 'source' && lineCount > 400) {
		out.push(issue('error', 'non-source note exceeds 400 lines', p));
	}

	return out;
}

export function checkSourceExtracted(body: string, meta: Record<string, unknown>, p: string): Issue[] {
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

export function checkUniqueIds(notes: Note[]): Issue[] {
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
// lintNotes — full lint pass
// ---------------------------------------------------------------------------

export function lintNotes(knowledgeDir: string): {issues: Issue[]; noteCount: number} {
	const notes = allNotes(knowledgeDir);
	const issues: Issue[] = [];

	for (const n of notes) {
		const p = n.path;
		if (n.err) {
			issues.push(issue('error', `parse error: ${n.err}`, p));
			continue;
		}

		const frontmatterIssues = checkFrontmatter(n.meta, p, knowledgeDir);
		issues.push(...frontmatterIssues);

		// If type is unknown skip structural checks that depend on it
		const type = (n.meta.type ?? '');
		if (!TYPE_DIRS[type]) {
			continue;
		}

		issues.push(
			...checkRequiredSections(n.body, type, p),
			...checkLength(p, type),
			...checkSourceExtracted(n.body, n.meta, p),
		);
	}

	// Cross-note checks run after the per-note loop
	issues.push(...checkUniqueIds(notes.filter(n => !n.err)));

	return {issues, noteCount: notes.length};
}
