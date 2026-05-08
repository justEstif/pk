import path from 'node:path';
import type {Command} from 'commander';
import {updateKnowledgeNote} from '../lib/operations.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function registerEdit(program: Command): void {
	program
		.command('edit')
		.description('Edit an existing knowledge note')
		.argument('<path>', 'Path to the note file')
		.option('-e, --editor <cmd>', 'Editor command to use')
		.action(async (notePath: string, options: {editor?: string}) => {
			const knowledgeDir = requireKnowledgeDir();
			const fullPath = notePath.startsWith('/') ? notePath : path.join(knowledgeDir, notePath);

			try {
				const resultPath = await updateKnowledgeNote(fullPath, options.editor);
				console.log(`Edited note: ${resultPath}`);
			} catch (error) {
				if (error instanceof Error) {
					console.error(`Error: ${error.message}`);
				}

				process.exit(1);
			}
		});
}
