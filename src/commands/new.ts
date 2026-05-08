import type {Command} from 'commander';
import {createKnowledgeNote} from '../lib/operations.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';
import {writeJson} from '../lib/json-output.ts';

export function registerNew(program: Command): void {
	program
		.command('new <type> <title>')
		.description('Create a new knowledge note')
		.option('--tags <tags>', 'Comma-separated tags', '')
		.option('--json', 'JSON output')
		.action(async (type: string, title: string, opts: {tags: string; json: boolean}) => {
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

			if (opts.json) {
				writeJson({path: notePath});
				return;
			}

			console.log(notePath);
		});
}
