import {
	existsSync, readFileSync, readdirSync, statSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Returns the directory containing the pk skill bundle shipped with this package.
 *
 * In production the whole package bundles to dist/index.js, so import.meta.dir
 * is dist/ and skill/ is one level up. In development import.meta.dir is
 * src/lib/ so skill/ is two levels up. We probe both so the same binary works
 * in both contexts.
 */
export function skillSourceDir(): string {
	const fromDist = path.resolve(import.meta.dir, '..', 'skill');
	if (existsSync(fromDist)) {
		return fromDist;
	}

	return path.resolve(import.meta.dir, '..', '..', 'skill');
}

/**
 * Returns the directory containing the static plugin bundle shipped with this package.
 *
 * Same resolution strategy as skillSourceDir: dist/ → one level up; src/lib/ → two up.
 */
export function pluginSourceDir(): string {
	const fromDist = path.resolve(import.meta.dir, '..', 'plugin');
	if (existsSync(fromDist)) {
		return fromDist;
	}

	return path.resolve(import.meta.dir, '..', '..', 'plugin');
}

/** Returns the ~/.pk home directory for all pk knowledge bases. */
export function pkHome(home?: string): string {
	return path.join(home ?? process.env.HOME ?? os.homedir(), '.pk');
}

/** Returns the directory for a named global project: ~/.pk/<name> */
export function projectDir(name: string): string {
	return path.join(pkHome(), name);
}

export type PkProjectConfig = {
	knowledgeDir: string;
	mode: 'local' | 'global';
};

export type PkGlobalConfig = {
	currentProject?: string;
};

function readGlobalConfig(home?: string): PkGlobalConfig | null {
	const configPath = path.join(pkHome(home), 'config.json');
	if (!existsSync(configPath)) {
		return null;
	}

	try {
		return JSON.parse(readFileSync(configPath, 'utf8')) as PkGlobalConfig;
	} catch {
		return null;
	}
}

/**
 * Walk up from startDir looking for .pk/config.json.
 * Returns the parsed config and the directory it was found in, or null if not found.
 */
export function findPkProjectConfig(startDir: string): {config: PkProjectConfig; configDir: string} | null {
	let dir = startDir;
	while (true) {
		const candidate = path.join(dir, '.pk', 'config.json');
		if (existsSync(candidate)) {
			try {
				const config = JSON.parse(readFileSync(candidate, 'utf8')) as PkProjectConfig;
				return {config, configDir: dir};
			} catch {
				// Malformed config — stop here rather than silently walk further up
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
 * Precedence: PK_KNOWLEDGE_DIR env var > .pk/config.json (walk up CWD) > currentProject in ~/.pk/config.json > error
 */
export function requireKnowledgeDir(): string {
	if (process.env.PK_KNOWLEDGE_DIR) {
		return process.env.PK_KNOWLEDGE_DIR;
	}

	const found = findPkProjectConfig(process.cwd());
	if (found) {
		// Local mode: knowledge dir is always <configDir>/.pk — relocatable
		if (found.config.mode === 'local') {
			return path.join(found.configDir, '.pk');
		}

		if (found.config.knowledgeDir) {
			return found.config.knowledgeDir;
		}
	}

	// Global fallback: check currentProject in ~/.pk/config.json
	const globalConfig = readGlobalConfig();
	if (globalConfig?.currentProject) {
		const dir = projectDir(globalConfig.currentProject);
		if (existsSync(dir)) {
			return dir;
		}
	}

	throw new Error('No pk project found. Run: pk init --harness <harness>, or pk use <name> to switch to a global project.');
}

/** Returns sorted list of existing global project names under ~/.pk/ */
export function listExistingProjects(): string[] {
	const home = pkHome();
	if (!existsSync(home)) {
		return [];
	}

	return readdirSync(home)
		.filter(entry => statSync(path.join(home, entry)).isDirectory())
		.toSorted();
}
