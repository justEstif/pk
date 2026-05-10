import type {Command} from 'commander';
import {loadConfig, saveConfig} from '../lib/config.ts';

export function registerConfig(program: Command): void {
	program
		.command('config')
		.description('Show or update pk configuration (~/.pk/config.json)')
		.option(
			'--embedding <model>',
			'Enable local embeddings with the given model',
		)
		.option('--no-embedding', 'Disable embeddings')
		.action(async (options: {embedding?: string | false}) => {
			const config = await loadConfig();

			if (options.embedding === false) {
				config.embedding = {enabled: false, provider: null, model: null};
			} else if (options.embedding !== undefined) {
				config.embedding = {
					enabled: true,
					provider: 'local',
					model: options.embedding,
				};
			}

			await saveConfig(config);
			console.log(JSON.stringify(config, null, 2));
		});
}
