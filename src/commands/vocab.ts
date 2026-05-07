import type {Command} from 'commander';
import {vocab} from '../lib/db.ts';

function knowledgeDir(): string {
	const dir = process.env.PK_KNOWLEDGE_DIR;
	if (!dir) {
		console.error('PK_KNOWLEDGE_DIR is not set. Run: pk init <name> --harness <harness>');
		process.exit(1);
	}

	return dir;
}

export function registerVocab(program: Command): void {
	program
		.command('vocab')
		.description('List tags in the knowledge base by frequency')
		.option('--json', 'JSON output')
		.action((opts: {json: boolean}) => {
			const dir = knowledgeDir();
			let tags;
			try {
				tags = vocab(dir);
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
