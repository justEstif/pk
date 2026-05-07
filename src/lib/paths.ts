import {existsSync} from 'node:fs';
import path from 'node:path';

const KNOWLEDGE_DIR = 'knowledge';

/** Walk upward from cwd to find knowledge/ directory. */
export function findKnowledgeDir(cwd: string = process.cwd()): string {
	const envOverride = process.env.PK_KNOWLEDGE_DIR;
	if (envOverride) {
		return path.resolve(envOverride);
	}

	let current = path.resolve(cwd);
	while (true) {
		const candidate = path.join(current, KNOWLEDGE_DIR);
		if (existsSync(candidate)) {
			return candidate;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}

		current = parent;
	}

	return path.join(path.resolve(cwd), KNOWLEDGE_DIR);
}
