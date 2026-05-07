import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {Command} from 'commander';
import {z} from 'zod';
import {
	allNotes, REQUIRED_SECTIONS, STATUSES, TYPE_DIRS, LENGTH_WARN,
} from '../lib/notes.ts';
import {findKnowledgeDir} from '../lib/paths.ts';

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
	id: z.string({required_error: missing('id'), invalid_type_error: missing('id')})
		.min(1, missing('id')),
	type: z.string({required_error: missing('type'), invalid_type_error: missing('type')})
		.min(1, missing('type')),
	title: z.string({required_error: missing('title'), invalid_type_error: missing('title')})
		.min(1, missing('title')),
	created: z.preprocess(coerceDate, z.string({required_error: missing('created'), invalid_type_error: missing('created')}).min(1, missing('created'))),
	updated: z.preprocess(coerceDate, z.string({required_error: missing('updated'), invalid_type_error: missing('updated')}).min(1, missing('updated'))),
	status: z.string({required_error: missing('status'), invalid_type_error: missing('status')})
		.min(1, missing('status')),
	tags: z.array(z.string(), {
		required_error: 'tags must be a flat list',
		invalid_type_error: 'tags must be a flat list',
	}),
}).passthrough().superRefine((data, ctx) => {
	if (data.type && !TYPE_DIRS[data.type]) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['type'],
			message: `invalid type: ${data.type}`,
		});
	}

	if (data.type && STATUSES[data.type] && !STATUSES[data.type]!.includes(data.status)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['status'],
			message: `invalid status '${data.status}' for type ${data.type}`,
		});
	}
});

// ---------------------------------------------------------------------------
// checkFrontmatter — replaces checkRequiredFields + checkTags + checkTypeAndLocation
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

// ---------------------------------------------------------------------------
// Structural checks (unchanged)
// ---------------------------------------------------------------------------

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

export function lintNotes(knowledgeDir: string): {issues: Issue[]; noteCount: number} {
	const notes = allNotes(knowledgeDir);
	const issues: Issue[] = [];
	const ids = new Map<string, string>();

	for (const n of notes) {
		const p = n.path;
		if (n.err) {
			issues.push(issue('error', `parse error: ${n.err}`, p));
			continue;
		}

		const frontmatterIssues = checkFrontmatter(n.meta, p, knowledgeDir);
		issues.push(...frontmatterIssues);

		// If frontmatter has errors (not just warnings), type may be unknown
		// so skip structural checks that depend on a valid type
		const type = (n.meta.type ?? '');
		if (!TYPE_DIRS[type]) {
			continue;
		}

		const id = (n.meta.id ?? '');
		if (id) {
			if (ids.has(id)) {
				issues.push(issue('error', `duplicate id ${id} (also in ${ids.get(id)})`, p));
			} else {
				ids.set(id, p);
			}
		}

		issues.push(
			...checkRequiredSections(n.body, type, p),
			...checkLength(p, type),
			...checkSourceExtracted(n.body, n.meta, p),
		);
	}

	return {issues, noteCount: notes.length};
}

export function registerLint(program: Command): void {
	program
		.command('lint')
		.description('Validate knowledge notes structure and frontmatter')
		.action(() => {
			const knowledgeDir = findKnowledgeDir();
			const {issues, noteCount} = lintNotes(knowledgeDir);

			let hasError = false;
			for (const {level, path: p, message} of issues) {
				const prefix = level === 'error' ? 'ERROR' : 'WARN ';
				const out = level === 'error' ? process.stderr : process.stdout;
				out.write(`${prefix} ${p}: ${message}\n`);
				if (level === 'error') {
					hasError = true;
				}
			}

			if (hasError) {
				process.exit(1);
			} else {
				console.log(`lint passed (${noteCount} files, ${issues.filter(i => i.level === 'warn').length} warnings)`);
			}
		});
}
