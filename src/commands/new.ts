import type {Command} from 'commander';
import matter from 'gray-matter';
import {createNote} from '../lib/notes.ts';
import {commitKnowledgeFile} from '../lib/git.ts';
import {upsertVector} from '../lib/db.ts';
import {loadConfig} from '../lib/config.ts';
import {getProvider} from '../lib/embedding.ts';
import {runDir, writeJson} from '../lib/runner.ts';

async function tryEmbedNote(knowledgeDir: string, notePath: string): Promise<void> {
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

export function registerNew(program: Command): void {
	program
		.command('new <type> <title>')
		.description('Create a new knowledge note')
		.option('--tags <tags>', 'Comma-separated tags', '')
		.option('--pretty', 'Human-readable output')
		.action(runDir(async (dir, type: string, title: string, opts: {tags: string; pretty?: boolean}) => {
			const notePath = await createNote(dir, type, title, opts.tags);
			await commitKnowledgeFile(notePath, 'intake');
			await tryEmbedNote(dir, notePath).catch(() => {/* best-effort */});

			if (opts.pretty) {
				console.log(notePath);
				return;
			}

			writeJson({path: notePath});
		}));
}
