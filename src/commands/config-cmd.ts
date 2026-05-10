import type {Command} from 'commander';
import {loadConfig, saveConfig} from '../lib/config.ts';

export function registerConfig(program: Command): void {
	program
		.command('config')
		.description('Show or update pk configuration (~/.pk/config.json)')
		.option('--embedding <model>', 'Enable Ollama embeddings with the given model (e.g. nomic-embed-text)')
		.option('--no-embedding', 'Disable embeddings')
		.option('--base-url <url>', 'Ollama base URL (default: http://localhost:11434)')
		.action(async (options: {embedding?: string | false; baseUrl?: string}) => {
			const config = await loadConfig();

			if (options.embedding === false) {
				config.embedding = {enabled: false, model: null};
			} else if (options.embedding !== undefined) {
				config.embedding = {
					enabled: true,
					model: options.embedding,
					...(options.baseUrl ? {baseUrl: options.baseUrl} : {}),
				};
			} else if (options.baseUrl !== undefined) {
				config.embedding.baseUrl = options.baseUrl;
			}

			await saveConfig(config);
			console.log(JSON.stringify(config, null, 2));
		});
}
