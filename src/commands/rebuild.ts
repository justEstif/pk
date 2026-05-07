import type {Command} from 'commander';
import {buildIndexFiles} from '../lib/rebuild.ts';

function knowledgeDir(): string {
	const dir = process.env.PK_KNOWLEDGE_DIR;
	if (!dir) {
		console.error('PK_KNOWLEDGE_DIR is not set. Run: pk init <name> --harness <harness>');
		process.exit(1);
	}

	return dir;
}

export function registerRebuild(program: Command): void {
	program
		.command('index')
		.description('Rebuild FTS5 search index and markdown index files')
		.action(() => {
			const dir = knowledgeDir();
			const {ftsCount, indexDir} = buildIndexFiles(dir);
			console.log(`indexed ${ftsCount} notes`);
			console.log(`wrote indexes to ${indexDir}`);
		});
}
