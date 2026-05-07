import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import type {Command} from 'commander';
import {renderTemplate} from '../lib/templates.ts';
import {TYPE_DIRS} from '../lib/schema.ts';
import {slugify} from '../lib/notes.ts';

function knowledgeDir(): string {
	const dir = process.env.PK_KNOWLEDGE_DIR;
	if (!dir) {
		console.error('PK_KNOWLEDGE_DIR is not set. Run: pk init <name> --harness <harness>');
		process.exit(1);
	}

	return dir;
}

export function registerNew(program: Command): void {
	program
		.command('new <type> <title>')
		.description('Create a new knowledge note')
		.option('--tags <tags>', 'Comma-separated tags', '')
		.action((type: string, title: string, opts: {tags: string}) => {
			if (!TYPE_DIRS[type]) {
				console.error(`Unknown type: ${type}. Valid: ${Object.keys(TYPE_DIRS).join(', ')}`);
				process.exit(1);
			}

			const dir = knowledgeDir();
			const today = new Date().toISOString().slice(0, 10);
			const slug = slugify(title);
			const tags = opts.tags
				.split(',')
				.map(t => t.trim())
				.filter(Boolean)
				.join(', ');

			const content = renderTemplate(type, {
				date: today, slug, tags, title,
			});
			const noteDir = path.join(dir, TYPE_DIRS[type]);
			mkdirSync(noteDir, {recursive: true});

			const outPath = path.join(noteDir, `${today}-${slug}.md`);
			if (existsSync(outPath)) {
				console.error(`Already exists: ${outPath}`);
				process.exit(1);
			}

			writeFileSync(outPath, content);
			console.log(outPath);
		});
}
