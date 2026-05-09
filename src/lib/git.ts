import path from 'node:path';
import {$} from 'bun';

export type HistoryOptions = {
	limit?: number;
	type?: 'commits' | 'notes' | 'all';
	filterType?: 'note' | 'decision' | 'question' | 'source';
	filterTag?: string;
	filterOperation?: 'create' | 'update' | 'delete';
};

export type HistoryEntry = {
	hash: string;
	timestamp: string;
	message: string;
	type: 'commit' | 'note';
	noteType?: string;
	operation?: string;
	tags?: string[];
};

type ParsedCommit = {
	operation: string;
	noteType: string;
	title: string;
	tags?: string[];
};

/**
 * Initialize a git repository in the knowledge directory.
 * Creates an initial commit with .gitignore and initializes git notes.
 */
export async function initRepo(knowledgeDir: string): Promise<void> {
	// Initialize git repo
	const initResult = await $`git -C ${knowledgeDir} init`.quiet();
	if (initResult.exitCode !== 0) {
		throw new Error(`Git init failed: ${initResult.stderr.toString()}`);
	}

	// Configure git user (required for commits)
	await $`git -C ${knowledgeDir} config user.name "pk"`.quiet();
	await $`git -C ${knowledgeDir} config user.email "pk@local"`.quiet();

	// Create .gitignore if it doesn't exist

	// Disable GPG signing for this repo — avoids hanging on passphrase prompt
	await $`git -C ${knowledgeDir} config commit.gpgsign false`.quiet();
	const gitignorePath = path.join(knowledgeDir, '.gitignore');
	const ignoreContent = '*.db\n*.db-shm\n*.db-wal\nnode_modules\n';
	await Bun.write(gitignorePath, ignoreContent);

	// Initial commit
	await $`git -C ${knowledgeDir} add .`.quiet();
	const commitResult = await $`git -C ${knowledgeDir} commit -m "pk: initialize knowledge base"`.quiet();
	if (commitResult.exitCode !== 0) {
		throw new Error(`Git commit failed: ${commitResult.stderr.toString()}`);
	}

	// Seed the notes ref so it exists for later use
	await $`git -C ${knowledgeDir} notes add -m "pk: initialize notes ref"`.quiet().catch(() => {
		// Ignore failure - notes ref will be created on first use
	});
}

/**
 * Commit a knowledge file with a structured message.
 */
export async function commitKnowledgeFile(
	filePath: string,
	operation: 'intake' | 'update',
): Promise<void> {
	const knowledgeDir = path.dirname(filePath);
	const title = extractTitleFromPath(filePath);
	const noteType = extractTypeFromPath(filePath);
	const message = `knowledge: ${operation} ${noteType} ${title}`;

	try {
		await $`git -C ${knowledgeDir} add ${filePath}`.quiet();
		await $`git -C ${knowledgeDir} commit -m ${message}`.quiet();
	} catch (error) {
		console.warn(`[pk] Git commit failed: ${String(error)}`);
	}
}

/**
 * Commit the deletion of a knowledge file.
 */
export async function commitDelete(
	knowledgeDir: string,
	notePath: string,
): Promise<void> {
	const title = extractTitleFromPath(notePath);
	const noteType = extractTypeFromPath(notePath);
	const message = `knowledge: delete ${noteType} ${title}`;

	try {
		await $`git -C ${knowledgeDir} add ${notePath}`.quiet();
		await $`git -C ${knowledgeDir} commit -m ${message}`.quiet();
	} catch (error) {
		console.warn(`[pk] Git commit failed: ${String(error)}`);
	}
}

/**
 * Add a git note for a synthesize operation.
 */
export async function addSynthesizeNote(
	knowledgeDir: string,
	query: string,
): Promise<void> {
	const timestamp = new Date().toISOString();
	const noteContent = `pk synthesize\nQuery: ${query}\nTimestamp: ${timestamp}`;

	try {
		await $`git -C ${knowledgeDir} notes add -m ${noteContent}`.quiet();
	} catch (error) {
		console.warn(`[pk] Failed to add git note: ${String(error)}`);
	}
}

/**
 * Get git history with filtering support.
 */
export async function getHistory(
	knowledgeDir: string,
	opts: HistoryOptions,
): Promise<HistoryEntry[]> {
	const limit = opts.limit ?? 20;
	const lines = await getGitLog(knowledgeDir, limit * 2);
	return parseHistoryEntries(lines, limit, opts);
}

async function getGitLog(knowledgeDir: string, limit: number): Promise<string[]> {
	const format = '%H|%ai|%s';
	const result = await $`git -C ${knowledgeDir} log --show-notes=refs/notes/commits -n ${limit} --format=${format}`.quiet();
	return result.stdout.toString().trim().split('\n');
}

function parseHistoryEntries(
	lines: string[],
	limit: number,
	opts: HistoryOptions,
): HistoryEntry[] {
	const entries: HistoryEntry[] = [];

	for (const line of lines) {
		if (entries.length >= limit) {
			break;
		}

		if (!shouldIncludeLine(line)) {
			continue;
		}

		const entry = parseHistoryLine(line, opts);
		if (entry) {
			entries.push(entry);
		}
	}

	return entries;
}

function shouldIncludeLine(line: string): boolean {
	const parts = line.split('|');
	return parts.length >= 3 && Boolean(parts[0]) && Boolean(parts[1]) && Boolean(parts[2]);
}

function parseHistoryLine(line: string, opts: HistoryOptions): HistoryEntry | undefined {
	const parts = line.split('|');
	if (parts.length < 3) {
		return undefined;
	}

	const [hash, timestamp, message] = parts;
	if (!hash || !timestamp || !message) {
		return undefined;
	}

	const parsed = parseCommitMessage(message);
	if (parsed) {
		return parseCommitEntry({
			hash, timestamp, message, parsed, opts,
		});
	}

	return parseSynthesizeEntry({
		hash, timestamp, message, opts,
	});
}

type CommitEntryParams = {
	hash: string;
	timestamp: string;
	message: string;
	parsed: ParsedCommit;
	opts: HistoryOptions;
};

function parseCommitEntry({hash, timestamp, message, parsed, opts}: CommitEntryParams): HistoryEntry | undefined {
	if (!passesFilters(parsed, opts)) {
		return undefined;
	}

	return {
		hash,
		timestamp,
		message,
		type: 'commit',
		...parsed,
	};
}

type SynthesizeEntryParams = {
	hash: string;
	timestamp: string;
	message: string;
	opts: HistoryOptions;
};

function parseSynthesizeEntry({hash, timestamp, message, opts}: SynthesizeEntryParams): HistoryEntry | undefined {
	if (!message.startsWith('pk synthesize')) {
		return undefined;
	}

	if (opts.type === 'commits') {
		return undefined;
	}

	return {
		hash,
		timestamp,
		message,
		type: 'note',
	};
}

function passesFilters(parsed: ParsedCommit | undefined, opts: HistoryOptions): boolean {
	if (!parsed) {
		return true;
	}

	if (opts.filterType && parsed.noteType !== opts.filterType) {
		return false;
	}

	if (opts.filterTag && !parsed.tags?.includes(opts.filterTag)) {
		return false;
	}

	if (opts.filterOperation && parsed.operation !== opts.filterOperation) {
		return false;
	}

	return true;
}

/**
 * Parse a structured commit message.
 */
export function parseCommitMessage(message: string): ParsedCommit | undefined {
	// Parse: "knowledge: <operation> <type> <title>"
	const match = /^knowledge: (intake|update|delete) (note|decision|question|source) (.+)$/v.exec(message);
	if (!match || match.length < 4) {
		return undefined;
	}

	const operation = match[1];
	const noteType = match[2];
	const title = match[3];
	if (!operation || !noteType || !title) {
		return undefined;
	}

	return {
		operation,
		noteType,
		title,
		tags: [], // Could extract from file if needed
	};
}

/**
 * Extract title from a knowledge note file path.
 */
export function extractTitleFromPath(filePath: string): string {
	// Extract title from path like ~/.pk/myproject/notes/2026-05-08-my-title.md
	const basename = path.basename(filePath, '.md');
	const parts = basename.split('-');
	// Remove date prefix (YYYY-MM-DD)
	if (parts.length > 3) {
		return parts.slice(3).join('-');
	}

	return basename;
}

/**
 * Extract note type from a knowledge note file path.
 */
function extractTypeFromPath(filePath: string): string {
	// Extract type from path like ~/.pk/myproject/notes/2026-05-08-my-title.md
	const parentDir = path.dirname(filePath);
	const dirName = path.basename(parentDir);
	// Convert plural directory name to singular type
	const singularMap: Record<string, string> = {
		notes: 'note',
		decisions: 'decision',
		questions: 'question',
		sources: 'source',
		indexes: 'index',
	};
	return singularMap[dirName] ?? dirName;
}

/**
 * Format history entries for display.
 */
export function formatHistory(entries: HistoryEntry[]): string {
	return entries
		.map(e => {
			const date = new Date(e.timestamp).toLocaleDateString();
			if (e.type === 'note') {
				// Replace newlines with spaces for single-line display
				const cleanMessage = e.message.replaceAll('\n', ' ');
				return `${date} | ${e.hash.slice(0, 7)} | 📋 ${cleanMessage}`;
			}

			return `${date} | ${e.hash.slice(0, 7)} | ${e.operation} ${e.noteType} | ${e.message.replace(/^knowledge: [^ ]+ [^ ]+ /v, '')}`;
		})
		.join('\n');
}
