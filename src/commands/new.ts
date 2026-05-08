import type {Command} from 'commander';
import {createKnowledgeNote} from '../lib/operations.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function registerNew(program: Command): void {
	program
		.command('new <type> <title>')
		.description('Create a new knowledge note')
		.option('--tags <tags>', 'Comma-separated tags', '')
		.action(async (type: string, title: string, opts: {tags: string}) => {
			let dir: string;
			try {
				dir = requireKnowledgeDir();
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			let notePath: string;
			try {
				notePath = await createKnowledgeNote(dir, type, title, opts.tags);
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			console.log(notePath);
		});
}
