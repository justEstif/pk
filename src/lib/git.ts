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
	tag?: string;
	meta?: EventMeta;
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
	const commitResult = await $`git -C ${knowledgeDir} -c commit.gpgsign=false commit -m "pk: initialize knowledge base"`.quiet();
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
		// -c commit.gpgsign=false: prevents gpg-agent passphrase prompts hanging
		// in non-TTY contexts (MCP server, CI). The repo-level setting from
		// initRepo covers new repos; this covers pre-existing repos with global
		// commit.gpgsign=true.
		await $`git -C ${knowledgeDir} -c commit.gpgsign=false commit -m ${message}`.quiet();
	} catch (error) {
		console.warn(`[pk] Git commit failed: ${String(error)}`);
	}
}

/**
 * Commit generated index files after a rebuild.
 * Silent no-op when nothing changed.
 */
export async function commitIndexRebuild(knowledgeDir: string): Promise<void> {
	const indexDir = path.join(knowledgeDir, 'indexes');
	try {
		await $`git -C ${knowledgeDir} add ${indexDir}`.quiet();
		const result = await $`git -C ${knowledgeDir} -c commit.gpgsign=false commit -m "knowledge: rebuild indexes"`.quiet();
		if (result.exitCode !== 0) {
			const out = result.stdout.toString() + result.stderr.toString();
			if (!out.includes('nothing to commit')) {
				console.warn(`[pk] Git commit failed (indexes): ${out}`);
			}
		}
	} catch (error) {
		console.warn(`[pk] Git commit failed (indexes): ${String(error)}`);
	}
}

export async function commitDelete(
	knowledgeDir: string,
	notePath: string,
): Promise<void> {
	const title = extractTitleFromPath(notePath);
	const noteType = extractTypeFromPath(notePath);
	const message = `knowledge: delete ${noteType} ${title}`;

	try {
		await $`git -C ${knowledgeDir} rm --cached ${notePath}`.quiet();
		await $`git -C ${knowledgeDir} -c commit.gpgsign=false commit -m ${message}`.quiet();
	} catch (error) {
		console.warn(`[pk] Git commit failed: ${String(error)}`);
	}
}

export type EventMeta = Record<string, string>;

/**
 * Write a git note on HEAD recording a pk event (search, session-open, etc.).
 * Does not create a commit — notes are append-only annotations.
 */
export async function writeEvent(
	knowledgeDir: string,
	tag: string,
	meta?: EventMeta,
): Promise<void> {
	const timestamp = new Date().toISOString();
	const lines = [`pk event:${tag}`, `Timestamp: ${timestamp}`];
	if (meta) {
		for (const [key, value] of Object.entries(meta)) {
			lines.push(`${key}: ${value}`);
		}
	}

	const noteContent = lines.join('\n');

	try {
		await $`git -C ${knowledgeDir} notes append -m ${noteContent}`.quiet();
	} catch (error) {
		console.warn(`[pk] Failed to write event: ${String(error)}`);
	}
}

export type EventEntry = {timestamp: string; tag: string; meta: EventMeta};

/**
 * Get recent event entries from git notes.
 * Returns events in reverse-chronological order (most recent first).
 */
export async function getRecentEvents(knowledgeDir: string, limit = 10): Promise<EventEntry[]> {
	const entries = await getHistory(knowledgeDir, {limit: limit * 3, type: 'all'});
	const events = entries
		.filter((e): e is HistoryEntry & {tag: string; meta: EventMeta} => e.tag !== undefined && e.meta !== undefined)
		.map(e => ({
			timestamp: e.timestamp,
			tag: e.tag,
			meta: e.meta,
		}))
		.slice(0, limit);
	return events;
}

export type ParsedEvent = {tag: string; meta: EventMeta};

/**
 * Parse a git note written by writeEvent.
 * Returns undefined if the note is not an event note.
 */
export function parseEventNote(note: string): ParsedEvent | undefined {
	const match = /^pk event:(\S+)/v.exec(note);
	if (!match?.[1]) {
		return undefined;
	}

	const tag = match[1];
	const meta: EventMeta = {};
	for (const line of note.split('\n').slice(1)) {
		const colon = line.indexOf(': ');
		if (colon > 0) {
			meta[line.slice(0, colon)] = line.slice(colon + 2);
		}
	}

	return {tag, meta};
}

/**
 * Get git history with filtering support.
 */
export async function getHistory(
	knowledgeDir: string,
	opts: HistoryOptions,
): Promise<HistoryEntry[]> {
	const limit = opts.limit ?? 20;
	const raw = await getGitLog(knowledgeDir, limit * 2);
	const commits = splitLogEntries(raw);
	return parseCommits(commits, limit, opts);
}

async function getGitLog(knowledgeDir: string, limit: number): Promise<string> {
	const format = '%H|%ai|%s%n%N';
	const result = await $`git -C ${knowledgeDir} log --show-notes=refs/notes/commits -n ${limit} --format=${format}`.quiet();
	return result.stdout.toString().trim();
}

type RawCommit = {hash: string; timestamp: string; subject: string; note: string};

/**
 * Split raw git log output (with %N notes) into structured commit blocks.
 * Entries are separated by blank lines; each starts with hash|timestamp|subject.
 */
function splitLogEntries(raw: string): RawCommit[] {
	const commits: RawCommit[] = [];
	let current: Partial<RawCommit> | undefined;
	const noteLines: string[] = [];
	let inNote = false;

	for (const line of raw.split('\n')) {
		const pipeParts = line.split('|');
		if (pipeParts.length >= 3 && pipeParts[0]?.length === 40 && /^[0-9a-f]+$/v.test(pipeParts[0])) {
			// New commit entry — flush previous
			if (current?.hash) {
				commits.push({
					...current as RawCommit,
					note: noteLines.join('\n'),
				});
			}

			current = {hash: pipeParts[0], timestamp: pipeParts[1]!, subject: pipeParts.slice(2).join('|')};
			noteLines.length = 0;
			inNote = false;
		} else if (current?.hash) {
			// Part of the note (or blank line after subject)
			if (line === '' && noteLines.length === 0) {
				// Blank between subject and note start — skip
				inNote = true;
			} else if (line === '' && noteLines.length > 0) {
				// Blank line within note — keep as separator
				noteLines.push('');
				inNote = true;
			} else {
				noteLines.push(line);
				inNote = true;
			}
		}
	}

	// Flush last
	if (current?.hash) {
		commits.push({
			...current as RawCommit,
			note: noteLines.join('\n'),
		});
	}

	return commits;
}

function parseCommits(commits: RawCommit[], limit: number, opts: HistoryOptions): HistoryEntry[] {
	const entries: HistoryEntry[] = [];

	for (const commit of commits) {
		if (entries.length >= limit) {
			break;
		}

		// Parse commit entry
		const parsed = parseCommitMessage(commit.subject);
		if (parsed && passesFilters(parsed, opts)) {
			entries.push({
				hash: commit.hash,
				timestamp: commit.timestamp,
				message: commit.subject,
				type: 'commit',
				...parsed,
			});
		}

		// Parse events from notes
		if (commit.note && opts.type !== 'commits') {
			const events = parseNoteEvents(commit.note, commit.hash);
			for (const event of events) {
				if (entries.length >= limit) {
					break;
				}

				entries.push(event);
			}
		}
	}

	return entries;
}

/**
 * Parse events from a git note blob. Splits on `pk event:` boundaries.
 */
function parseNoteEvents(note: string, hash: string): HistoryEntry[] {
	const events: HistoryEntry[] = [];
	// Split into blocks starting with 'pk event:'
	const blocks = note.split(/(?=^pk event:)/vm);
	for (const block of blocks) {
		const trimmed = block.trim();
		if (!trimmed.startsWith('pk event:')) {
			continue;
		}

		const parsed = parseEventNote(trimmed);
		if (parsed) {
			events.push({
				hash,
				timestamp: parsed.meta.Timestamp ?? '',
				message: trimmed,
				type: 'note',
				tag: parsed.tag,
				meta: parsed.meta,
			});
		}
	}

	return events;
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
			if (e.tag) {
				// Event entry — show tag and key metadata
				const metaParts = Object.entries(e.meta ?? {})
					.filter(([k]) => k !== 'Timestamp')
					.map(([k, v]) => `${k}: ${v}`)
					.join(' ');
				return `${date} | ${e.hash.slice(0, 7)} | \u{1F50D} ${e.tag}${metaParts ? ' | ' + metaParts : ''}`;
			}

			if (e.type === 'note') {
				// Replace newlines with spaces for single-line display
				const cleanMessage = e.message.replaceAll('\n', ' ');
				return `${date} | ${e.hash.slice(0, 7)} | \u{1F4CB} ${cleanMessage}`;
			}

			return `${date} | ${e.hash.slice(0, 7)} | ${e.operation} ${e.noteType} | ${e.message.replace(/^knowledge: [^ ]+ [^ ]+ /v, '')}`;
		})
		.join('\n');
}
