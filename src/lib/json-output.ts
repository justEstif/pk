/**
 * JSON output types for CLI commands.
 * These are the stable schemas for CLI --json output.
 */
import type {Issue} from './lint.ts';
import type {HistoryEntry} from './git.ts';

// ---------------------------------------------------------------------------
// Per-command output shapes
// ---------------------------------------------------------------------------

export type JsonNewOutput = {
	path: string;
};

export type JsonLintOutput = {
	issues: Issue[];
	noteCount: number;
};

export type JsonSearchOutput = {
	results: JsonSearchResult[];
};

export type JsonSearchResult = {
	id: string;
	path: string;
	score: number;
	snippet: string;
	status: string;
	tags: string[];
	title: string;
	type: string;
};

export type JsonSynthesizeOutput = {
	label: string;
	notes: JsonSynthesizedNote[];
};

export type JsonSynthesizedNote = {
	path: string;
	type: string;
	status: string;
	title: string;
	tags: string[];
	excerpt: string;
};

export type JsonHistoryOutput = {
	entries: HistoryEntry[];
};

export type JsonDeleteOutput = {
	path: string;
	status: 'deleted';
};

export type JsonVocabOutput = {
	tags: Array<{tag: string; count: number}>;
};

export type JsonReadOutput = {
	path: string;
	content: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function writeJson(data: unknown): void {
	process.stdout.write(JSON.stringify(data) + '\n');
}
