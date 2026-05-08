import path from 'node:path';
import {$} from 'bun';
import {createNote} from './notes.ts';
import {validateNote, type Issue} from './lint.ts';
import {commitKnowledgeFile, commitDelete} from './git.ts';

/**
 * Derive the knowledge root from a note path.
 * Notes live at <knowledgeDir>/<typeDir>/<file>.md — two levels up.
 */
function knowledgeDirForNote(notePath: string): string {
	return path.dirname(path.dirname(notePath));
}

/**
 * Create a new knowledge note and commit it to git.
 */
export async function createKnowledgeNote(
	knowledgeDir: string,
	type: string,
	title: string,
	tags: string,
): Promise<string> {
	const filePath = await createNote(knowledgeDir, type, title, tags);

	await commitKnowledgeFile(filePath, 'intake');

	return filePath;
}

/**
 * Edit an existing knowledge note and commit the changes.
 */
export async function updateKnowledgeNote(
	notePath: string,
	editor?: string,
): Promise<string> {
	const editorCmd = editor ?? process.env.EDITOR ?? 'vim';

	// Open editor
	await $`${editorCmd} ${notePath}`;

	// Validate
	const knowledgeDir = knowledgeDirForNote(notePath);
	const issues = await validateNote(notePath, knowledgeDir);
	if (issues.some((i: Issue) => i.level === 'error')) {
		console.error('Validation failed:');
		for (const issue of issues) {
			console.error(`  ${issue.message}`);
		}

		throw new Error('Note validation failed');
	}

	// Commit
	await commitKnowledgeFile(notePath, 'update');

	return notePath;
}

/**
 * Delete a knowledge note and commit the deletion.
 */
export async function deleteKnowledgeNote(notePath: string): Promise<void> {
	const knowledgeDir = knowledgeDirForNote(notePath);

	// Delete file
	await $`rm ${notePath}`;

	// Commit deletion
	await commitDelete(knowledgeDir, notePath);
}
