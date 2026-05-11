import {
	existsSync, readFileSync, readdirSync, statSync,
} from 'node:fs';
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

export type PkProjectConfig = {
	knowledgeDir?: string;
};

/**
 * Walk up from startDir looking for .pk.json.
 * Returns the parsed config and the directory it was found in, or null if not found.
 */
export function findPkProjectConfig(startDir: string): {config: PkProjectConfig; configDir: string} | null {
	let dir = startDir;
	while (true) {
		const candidate = path.join(dir, '.pk.json');
		if (existsSync(candidate)) {
			try {
				const config = JSON.parse(readFileSync(candidate, 'utf8')) as PkProjectConfig;
				return {config, configDir: dir};
			} catch {
				// Malformed .pk.json — stop here rather than silently walk further up
				return null;
			}
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			return null;
		} // Reached filesystem root

		dir = parent;
	}
}

/**
 * Returns the knowledge directory for the current project.
 * Precedence: PK_KNOWLEDGE_DIR env var > .pk.json found by walking up from CWD.
 */
export function requireKnowledgeDir(): string {
	if (process.env.PK_KNOWLEDGE_DIR) {
		return process.env.PK_KNOWLEDGE_DIR;
	}

	const found = findPkProjectConfig(process.cwd());
	if (found?.config.knowledgeDir) {
		return found.config.knowledgeDir;
	}

	throw new Error('No .pk.json found. Run: pk init <name> --harness <harness>');
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
