import type {Command} from 'commander';
import {createNote} from '../lib/notes.ts';
import {commitKnowledgeFile} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerNew(program: Command): void {
	program
		.command('new <type> <title>')
		.description('Create a new knowledge note')
		.option('--tags <tags>', 'Comma-separated tags', '')
		.option('--json', 'JSON output')
		.action(runDir(async (dir, type: string, title: string, opts: {tags: string; json: boolean}) => {
			const notePath = await createNote(dir, type, title, opts.tags);
			await commitKnowledgeFile(notePath, 'intake');

			if (opts.json) {
				writeJson({path: notePath});
				return;
			}

			console.log(notePath);
		}));
}
