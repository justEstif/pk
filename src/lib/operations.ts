import {unlink} from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import {commitKnowledgeFile, commitDelete} from './git.ts';
import {createNote} from './notes.ts';
import {upsertVector} from './db.ts';
import {loadConfig} from './config.ts';
import {getProvider} from './embedding.ts';

/**
 * Embed a note if an embedding provider is configured.
 * Best-effort — failure is silently ignored.
 */
export async function tryEmbedNote(knowledgeDir: string, notePath: string): Promise<void> {
	const config = await loadConfig();
	const provider = getProvider(config.embedding);
	if (!provider) {
		return;
	}

	const text = await Bun.file(notePath).text();
	const {data, content} = matter(text);
	const id = data.id as string | undefined;
	if (!id) {
		return;
	}

	const [vec] = await provider.embed([`${String(data.title ?? '')}\n${content}`]);
	if (vec) {
		await upsertVector(knowledgeDir, id, notePath, vec);
	}
}

/**
 * Create a new knowledge note, commit it, and optionally embed it.
 * Used by both the CLI command and the MCP tool.
 */
export async function createKnowledgeNote(
	knowledgeDir: string,
	type: string,
	title: string,
	tags: string,
): Promise<string> {
	const notePath = await createNote(knowledgeDir, type, title, tags);
	await commitKnowledgeFile(notePath, 'intake');
	await tryEmbedNote(knowledgeDir, notePath).catch(() => {/* best-effort */});
	return notePath;
}

/**
 * Write new content to an existing knowledge note and commit it.
 * Rejects if the note does not exist or is outside the knowledge directory.
 * Used by both the CLI command and the MCP tool.
 */
export async function updateKnowledgeNote(
	knowledgeDir: string,
	notePath: string,
	content: string,
): Promise<void> {
	const file = Bun.file(notePath);
	if (!await file.exists()) {
		throw new Error(`Note not found: ${notePath}. Use 'pk new' to create.`);
	}

	const rel = path.relative(path.resolve(knowledgeDir), path.resolve(notePath));
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		throw new Error(`Path must be within knowledge directory: ${knowledgeDir}`);
	}

	await Bun.write(notePath, content);
	await commitKnowledgeFile(notePath, 'update');
}

/**
 * Delete a knowledge note and commit the deletion.
 * Resolves relative paths against the knowledge directory.
 * Used by both the CLI command and the MCP tool.
 */
export async function deleteKnowledgeNote(
	knowledgeDir: string,
	notePath: string,
): Promise<string> {
	const fullPath = notePath.startsWith('/') ? notePath : path.join(knowledgeDir, notePath);
	const file = Bun.file(fullPath);
	if (!await file.exists()) {
		throw new Error(`Note not found: ${fullPath}`);
	}

	await unlink(fullPath);
	await commitDelete(knowledgeDir, fullPath);
	return fullPath;
}
