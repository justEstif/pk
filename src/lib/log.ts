/**
 * Wide-event JSONL logger for pk operations.
 *
 * One line per operation (CLI command or MCP tool call), emitted when the
 * operation completes. Follows the canonical log line principle: build context
 * throughout, emit once with everything needed to debug.
 *
 * Log file: ~/.pk/pk.jsonl
 * Pruning:  when the file exceeds MAX_BYTES, it is trimmed to the last
 *           MAX_LINES lines in-place. Happens synchronously at append time —
 *           no background job, no cron.
 *
 * All operations are best-effort. A logging failure must never break the tool.
 */
import path from 'node:path';
import {
	appendFileSync, statSync, readFileSync, writeFileSync,
} from 'node:fs';
import {pkHome} from './paths.ts';

const MAX_BYTES = 2_000_000; // 2 MB
const MAX_LINES = 2000;

export type LogSource = 'cli';

export type LogEvent = {
	ts: string;
	source: LogSource;
	op: string;
	dir: string;
	ms: number;
	status: 'ok' | 'error';
	params?: Record<string, unknown>;
	error?: string;
};

function logPath(): string {
	return path.join(pkHome(), 'pk.jsonl');
}

/**
 * If the log file exceeds MAX_BYTES, rewrite it keeping only the last
 * MAX_LINES lines. Called before each append so the file never grows
 * unboundedly.
 */
function pruneIfNeeded(file: string): void {
	try {
		if (statSync(file).size <= MAX_BYTES) {
			return;
		}

		const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
		if (lines.length <= MAX_LINES) {
			return;
		}

		writeFileSync(file, lines.slice(-MAX_LINES).join('\n') + '\n');
	} catch {
		// File may not exist yet or be unreadable — that's fine.
	}
}

/**
 * Append one wide-event line to the log file.
 * Never throws.
 */
function appendEvent(event: LogEvent): void {
	try {
		const file = logPath();
		pruneIfNeeded(file);
		appendFileSync(file, JSON.stringify(event) + '\n');
	} catch {
		// Best-effort
	}
}

/**
 * Emit a completed operation log event.
 *
 * @param source  'cli'
 * @param op      Command or tool name (e.g. 'search', 'pk_new')
 * @param dir     Knowledge directory path
 * @param startMs Date.now() captured before the operation started
 * @param error   Error thrown by the operation, if any
 * @param params  Sanitized identifying params (no content bodies)
 */
export function logOp(
	source: LogSource,
	op: string,
	dir: string,
	startMs: number,
	error?: unknown,
	params?: Record<string, unknown>,
): void {
	const event: LogEvent = {
		ts: new Date().toISOString(),
		source,
		op,
		dir,
		ms: Date.now() - startMs,
		status: error === undefined ? 'ok' : 'error',
	};
	if (params && Object.keys(params).length > 0) {
		event.params = params;
	}

	if (error !== undefined) {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		event.error = error instanceof Error ? error.message : String(error);
	}

	appendEvent(event);
}
