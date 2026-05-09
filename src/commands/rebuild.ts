import type {Command} from 'commander';
import {buildIndexFiles} from '../lib/rebuild.ts';
import {runDir} from '../lib/runner.ts';

export function registerRebuild(program: Command): void {
	program
		.command('index')
		.description('Rebuild FTS5 search index and markdown index files')
		.action(runDir(async dir => {
			const {ftsCount, indexDir} = await buildIndexFiles(dir);
			console.log(`indexed ${ftsCount} notes`);
			console.log(`wrote indexes to ${indexDir}`);
		}));
}
