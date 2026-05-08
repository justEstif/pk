import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec = promisify(execFile);

function pkBin(): string {
	return process.env.PK_COMMAND ?? 'pk';
}

export type McpResult = {
	content: Array<{type: 'text'; text: string}>;
	isError?: boolean;
};

export function ok(text: string): McpResult {
	return {content: [{type: 'text', text}]};
}

export function fail(text: string): McpResult {
	return {content: [{type: 'text', text}], isError: true};
}

/**
 * Run a `pk` CLI command with --json and return MCP-formatted result.
 * Captures stdout on success, stderr on failure.
 */
export async function pkJson(args: string[]): Promise<McpResult> {
	try {
		const {stdout} = await exec(pkBin(), args, {
			env: {...process.env},
			maxBuffer: 10 * 1024 * 1024,
		});
		return ok(stdout.trim());
	} catch (e: unknown) {
		const {stderr, message} = e as {stderr?: string; message?: string};
		return fail(stderr?.trim() ?? message ?? String(e));
	}
}
