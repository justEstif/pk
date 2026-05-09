import path from 'node:path';
import {$} from 'bun';
import type {Command} from 'commander';
import {commitKnowledgeFile} from '../lib/git.ts';
import {validateNote, type Issue} from '../lib/lint.ts';
import {runDir} from '../lib/runner.ts';

export function registerEdit(program: Command): void {
	program
		.command('edit')
		.description('Edit an existing knowledge note')
		.argument('<path>', 'Path to the note file')
		.option('-e, --editor <cmd>', 'Editor command to use')
		.action(runDir(async (dir, notePath: string, options: {editor?: string}) => {
			const fullPath = notePath.startsWith('/') ? notePath : path.join(dir, notePath);

			const editorCmd = options.editor ?? process.env.EDITOR ?? 'vim';
			await $`${editorCmd} ${fullPath}`;

			const issues = await validateNote(fullPath, dir);
			if (issues.some((i: Issue) => i.level === 'error')) {
				console.error('Validation failed:');
				for (const issue of issues) {
					console.error(`  ${issue.message}`);
				}

				throw new Error('Note validation failed');
			}

			await commitKnowledgeFile(fullPath, 'update');
			console.log(`Edited note: ${fullPath}`);
		}));
}
