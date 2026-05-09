import path from 'node:path';
import {existsSync} from 'node:fs';
import {$} from 'bun';
import type {Command} from 'commander';
import {commitDelete} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerDelete(program: Command): void {
	program
		.command('delete')
		.description('Delete a knowledge note')
		.argument('<path>', 'Path to the note file')
		.option('-y, --yes', 'Skip confirmation prompt')
		.option('--json', 'JSON output')
		.action(runDir(async (dir, notePath: string, options: {yes?: boolean; json?: boolean}) => {
			const fullPath = resolveFullPath(notePath, dir);

			if (!checkFileExists(fullPath)) {
				throw new Error(`Note not found: ${fullPath}`);
			}

			// --json implies --yes (skip confirmation in machine-readable mode)
			if (!(await confirmDeletion(fullPath, options.yes ?? options.json))) {
				console.log('Aborted.');
				process.exit(0);
			}

			await $`rm ${fullPath}`;
			await commitDelete(dir, fullPath);

			if (options.json) {
				writeJson({path: fullPath, status: 'deleted'});
			} else {
				console.log(`Deleted: ${fullPath}`);
			}
		}));
}

function resolveFullPath(notePath: string, knowledgeDir: string): string {
	return notePath.startsWith('/') ? notePath : path.join(knowledgeDir, notePath);
}

function checkFileExists(fullPath: string): boolean {
	return existsSync(fullPath);
}

async function confirmDeletion(fullPath: string, skipConfirm: boolean | undefined): Promise<boolean> {
	if (skipConfirm) {
		return true;
	}

	console.log(`Deleting: ${fullPath}`);
	console.log('This action cannot be undone (but you can recover from git).');
	const confirm = await prompt('Delete this note? (y/N): ');
	return confirm.toLowerCase() === 'y';
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

	const combined = concatenateChunks(chunks);
	return new TextDecoder().decode(combined).trim();
}

function concatenateChunks(chunks: Uint8Array[]): Uint8Array {
	const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const combined = new Uint8Array(totalLength);
	let offset = 0;

	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}

	return combined;
}
