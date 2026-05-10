import type {Command} from 'commander';
import {loadConfig, saveConfig} from '../lib/config.ts';

export function registerConfig(program: Command): void {
	program
		.command('config')
		.description('Show or update pk configuration (~/.pk/config.json)')
		.option('--embedding <model>', 'Embedding model (empty to disable)')
		.action(async (opts: {embedding?: string}) => {
			const config = await loadConfig();

			if (opts.embedding !== undefined) {
				config.embedding = opts.embedding;
			}

			await saveConfig(config);
			console.log(JSON.stringify(config, null, 2));
		});
}
