import type {Command} from 'commander';
import {loadConfig, saveConfig} from '../lib/config.ts';

export function registerConfig(program: Command): void {
	program
		.command('config')
		.description('Show or update pk configuration (~/.pk/config.json)')
		.option('--auto-commit <bool>', 'Auto-commit knowledge operations (true/false)')
		.option('--embedding <model>', 'Embedding model (empty to disable)')
		.action((opts: {autoCommit?: string; embedding?: string}) => {
			const config = loadConfig();
			if (opts.autoCommit !== undefined) {
				config.auto_commit = opts.autoCommit === 'true';
			}

			if (opts.embedding !== undefined) {
				config.embedding = opts.embedding;
			}

			saveConfig(config);
			console.log(JSON.stringify(config, null, 2));
		});
}
