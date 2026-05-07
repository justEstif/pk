import type {Command} from 'commander';
import {buildIndexFiles} from '../lib/rebuild.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function registerRebuild(program: Command): void {
	program
		.command('index')
		.description('Rebuild FTS5 search index and markdown index files')
		.action(() => {
			let dir: string;
			try {
				dir = requireKnowledgeDir();
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			const {ftsCount, indexDir} = buildIndexFiles(dir);
			console.log(`indexed ${ftsCount} notes`);
			console.log(`wrote indexes to ${indexDir}`);
		});
}
