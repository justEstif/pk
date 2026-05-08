import path from 'node:path';
import {$} from 'bun';
import {createNote} from './notes.ts';
import {validateNote, type Issue} from './lint.ts';
import {commitKnowledgeFile, commitDelete} from './git.ts';
import {loadConfig} from './config.ts';

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
	const config = await loadConfig();

	if (config.auto_commit) {
		await commitKnowledgeFile(filePath, 'intake', config);
	}

	return filePath;
}

/**
 * Edit an existing knowledge note and commit the changes.
 */
export async function updateKnowledgeNote(
	notePath: string,
	editor?: string,
): Promise<string> {
	const config = await loadConfig();
	const editorCmd = editor ?? process.env.EDITOR ?? 'vim';

	// Open editor
	await $`${editorCmd} ${notePath}`;

	// Validate
	const issues = await validateNote(notePath);
	if (issues.some((i: Issue) => i.level === 'error')) {
		console.error('Validation failed:');
		for (const issue of issues) {
			console.error(`  ${issue.message}`);
		}

		throw new Error('Note validation failed');
	}

	// Commit
	if (config.auto_commit) {
		await commitKnowledgeFile(notePath, 'update', config);
	}

	return notePath;
}

/**
 * Delete a knowledge note and commit the deletion.
 */
export async function deleteKnowledgeNote(notePath: string): Promise<void> {
	const config = await loadConfig();
	const knowledgeDir = path.dirname(notePath);

	// Delete file
	await $`rm ${notePath}`;

	// Commit deletion
	if (config.auto_commit) {
		await commitDelete(knowledgeDir, notePath, config);
	}
}

/**
 * Extract title from a knowledge note file path.
 * Exported for use in other modules.
 */

export {extractTitleFromPath} from './git.ts';
