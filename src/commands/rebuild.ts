import type {Command} from 'commander';
import {buildIndexFiles} from '../lib/rebuild.ts';
import {findKnowledgeDir} from '../lib/paths.ts';

export function registerRebuild(program: Command): void {
	program
		.command('index')
		.description('Rebuild FTS5 search index and markdown index files')
		.action(() => {
			const knowledgeDir = findKnowledgeDir();
			const {ftsCount, indexDir} = buildIndexFiles(knowledgeDir);
			console.log(`indexed ${ftsCount} notes`);
			console.log(`wrote indexes to ${indexDir}`);
		});
}
