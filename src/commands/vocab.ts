import type {Command} from 'commander';
import {vocab} from '../lib/db.ts';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerVocab(program: Command): void {
	program
		.command('vocab')
		.description('List tags in the knowledge base by frequency')
		.option('--json', 'JSON output')
		.action(runDir((dir, opts: {json: boolean}) => {
			const tags = vocab(dir);

			if (opts.json) {
				writeJson({tags});
				return;
			}

			if (tags.length === 0) {
				console.log('No tags found.');
				return;
			}

			for (const {tag, count} of tags) {
				console.log(`${tag} (${count})`);
			}
		}));
}
