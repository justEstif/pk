import type {Command} from 'commander';
import {vocab} from '../lib/db.ts';
import {findKnowledgeDir} from '../lib/paths.ts';

export function registerVocab(program: Command): void {
	program
		.command('vocab')
		.description('List tags in the knowledge base by frequency')
		.option('--json', 'JSON output')
		.action((opts: {json: boolean}) => {
			const knowledgeDir = findKnowledgeDir();
			let tags;
			try {
				tags = vocab(knowledgeDir);
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			if (opts.json) {
				console.log(JSON.stringify(tags, null, 2));
				return;
			}

			if (tags.length === 0) {
				console.log('No tags found.');
				return;
			}

			for (const {tag, count} of tags) {
				console.log(`${tag} (${count})`);
			}
		});
}
