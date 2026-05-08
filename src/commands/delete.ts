import type {Command} from 'commander';
import {deleteKnowledgeNote} from '../lib/operations.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';
import path from 'node:path';
import {existsSync} from 'node:fs';

export function registerDelete(program: Command): void {
	program
		.command('delete')
		.description('Delete a knowledge note')
		.argument('<path>', 'Path to the note file')
		.option('-y, --yes', 'Skip confirmation prompt')
		.action(async (notePath: string, options: {yes?: boolean}) => {
			const knowledgeDir = requireKnowledgeDir();
			const fullPath = notePath.startsWith('/') ? notePath : path.join(knowledgeDir, notePath);

			// Check if file exists
			if (!existsSync(fullPath as string)) {
				console.error(`Error: Note not found: ${fullPath}`);
				process.exit(1);
			}

			// Confirm deletion
			if (!options.yes) {
				console.log(`Deleting: ${fullPath}`);
				console.log('This action cannot be undone (but you can recover from git).');
				const confirm = await prompt('Delete this note? (y/N): ');
				if (confirm.toLowerCase() !== 'y') {
					console.log('Aborted.');
					process.exit(0);
				}
			}

			try {
				await deleteKnowledgeNote(fullPath as string);
				console.log(`Deleted: ${fullPath}`);
			} catch (error) {
				if (error instanceof Error) {
					console.error(`Error: ${error.message}`);
				}

				process.exit(1);
			}
		});
}

async function prompt(question: string): Promise<string> {
	// Simple readline prompt
	process.stdout.write(question);
	const chunks: Uint8Array[] = [];

	for await (const chunk of process.stdin as unknown as AsyncIterable<Uint8Array>) {
		chunks.push(chunk);
		const str = new TextDecoder().decode(chunk);
		if (str.includes('\n')) {
			break;
		}
	}

	const combined = new Uint8Array(chunks.reduce((acc: number, chunk) => acc + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}

	return new TextDecoder().decode(combined).trim();
}
