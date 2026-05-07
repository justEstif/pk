import {existsSync, readdirSync, statSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Returns the ~/.pk home directory for all pk knowledge bases. */
export function pkHome(): string {
	return path.join(process.env.HOME ?? os.homedir(), '.pk');
}

/** Returns the directory for a named project: ~/.pk/<name> */
export function projectDir(name: string): string {
	return path.join(pkHome(), name);
}

/**
 * Reads PK_KNOWLEDGE_DIR from the environment.
 * Throws if unset — callers (CLI commands and MCP tools) must have it configured.
 */
export function requireKnowledgeDir(): string {
	const dir = process.env.PK_KNOWLEDGE_DIR;
	if (!dir) {
		throw new Error('PK_KNOWLEDGE_DIR is not set. Run: pk init <name> --harness <harness>');
	}

	return dir;
}

/** Returns sorted list of existing project names under ~/.pk/ */
export function listExistingProjects(): string[] {
	const home = pkHome();
	if (!existsSync(home)) {
		return [];
	}

	return readdirSync(home)
		.filter(entry => statSync(path.join(home, entry)).isDirectory())
		.toSorted();
}
