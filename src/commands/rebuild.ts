import type {Command} from 'commander';
import {buildIndexFiles} from '../lib/rebuild.ts';
import {loadConfig} from '../lib/config.ts';
import {getProvider} from '../lib/embedding.ts';
import {runDir} from '../lib/runner.ts';

export function registerRebuild(program: Command): void {
	program
		.command('index')
		.description('Rebuild FTS5 search index and markdown index files')
		.action(runDir(async dir => {
			const config = await loadConfig();
			let provider;
			try {
				provider = getProvider(config.embedding) ?? undefined;
			} catch (error) {
				console.error(`[pk] Embedding provider error: ${String(error)}`);
				process.exit(1);
			}

			const {ftsCount, indexDir} = await buildIndexFiles(dir, provider);
			console.log(`indexed ${ftsCount} notes`);
			if (provider) {
				console.log('embedded notes for semantic search');
			}

			console.log(`wrote indexes to ${indexDir}`);
		}));
}
