import path from 'node:path';
import {existsSync} from 'node:fs';
import type {Command} from 'commander';
import {deleteKnowledgeNote} from '../lib/operations.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function registerDelete(program: Command): void {
	program
		.command('delete')
		.description('Delete a knowledge note')
		.argument('<path>', 'Path to the note file')
		.option('-y, --yes', 'Skip confirmation prompt')
		.action(async (notePath: string, options: {yes?: boolean}) => {
			await handleDelete(notePath, options);
		});
}

async function handleDelete(notePath: string, options: {yes?: boolean}): Promise<void> {
	const knowledgeDir = requireKnowledgeDir();
	const fullPath = resolveFullPath(notePath, knowledgeDir);

	if (!checkFileExists(fullPath)) {
		console.error(`Error: Note not found: ${fullPath}`);
		process.exit(1);
	}

	if (!(await confirmDeletion(fullPath, options.yes))) {
		console.log('Aborted.');
		process.exit(0);
	}

	await performDeletion(fullPath);
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

async function performDeletion(fullPath: string): Promise<void> {
	try {
		await deleteKnowledgeNote(fullPath);
		console.log(`Deleted: ${fullPath}`);
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error: ${error.message}`);
		}

		process.exit(1);
	}
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
