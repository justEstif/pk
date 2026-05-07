import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {Command} from 'commander';
import {
	allNotes, REQUIRED_SECTIONS, STATUSES, TYPE_DIRS, LENGTH_WARN,
} from '../lib/notes.ts';
import {findKnowledgeDir} from '../lib/paths.ts';

export type IssueLevel = 'error' | 'warn';
export type Issue = {level: IssueLevel; message: string; path: string};

function issue(level: IssueLevel, message: string, p: string): Issue {
	return {level, message, path: p};
}

export function checkRequiredFields(meta: Record<string, unknown>, p: string): Issue[] {
	return ['id', 'type', 'title', 'created', 'updated', 'status', 'tags'].flatMap(f =>
		meta[f] === undefined || meta[f] === ''
			? [issue('error', `missing frontmatter field: ${f}`, p)]
			: []);
}

export function checkTypeAndLocation(
	meta: Record<string, unknown>,
	p: string,
	knowledgeDir: string,
): Issue[] {
	const type = meta.type as string;
	const out: Issue[] = [];
	if (!STATUSES[type]?.includes((meta.status ?? '') as string)) {
		out.push(issue('error', `invalid status '${String(meta.status)}' for type ${type}`, p));
	}

	const expected = path.resolve(knowledgeDir, TYPE_DIRS[type]!);
	if (path.resolve(path.dirname(p)) !== expected) {
		out.push(issue('error', `${type} must live in ${expected}/`, p));
	}

	return out;
}

export function checkRequiredSections(body: string, type: string, p: string): Issue[] {
	const sections = new Set([...body.matchAll(/^## (.+?)\s*$/gmv)].map(m => m[1]));
	return (REQUIRED_SECTIONS[type] ?? []).flatMap(req =>
		sections.has(req) ? [] : [issue('error', `missing section: ## ${req}`, p)]);
}

export function checkTags(tags: unknown, p: string): Issue[] {
	if (!Array.isArray(tags)) {
		return [issue('error', 'tags must be a flat list', p)];
	}

	if (tags.length === 0) {
		return [issue('warn', 'tags is empty', p)];
	}

	return [];
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

		issues.push(...checkRequiredFields(n.meta, p));

		const type = (n.meta.type ?? '');
		if (!TYPE_DIRS[type]) {
			issues.push(issue('error', `invalid type: ${type}`, p));
			continue;
		}

		issues.push(...checkTypeAndLocation(n.meta, p, knowledgeDir));

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
			...checkTags(n.meta.tags, p),
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
