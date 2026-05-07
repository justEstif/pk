import type {Command} from 'commander';
import {findKnowledgeDir} from '../lib/paths.ts';
import {excerpt} from '../lib/notes.ts';
import {selectNotes} from '../lib/synthesize.ts';

export function registerSynthesize(program: Command): void {
	program
		.command('synthesize [query]')
		.description('Produce a ranked context dump of matching notes')
		.option('--all', 'Include all notes')
		.option('--type <type>', 'Filter by note type')
		.option('--tag <tag>', 'Filter by tag')
		.option('--limit <n>', 'Max notes', '10')
		.option('--session-start', 'Open questions + recent decisions + active notes')
		.action((query: string | undefined, opts: {sessionStart: boolean; all: boolean; type: string; tag: string; limit: string}) => {
			const knowledgeDir = findKnowledgeDir();
			const today = new Date().toISOString().slice(0, 10);

			let notes;
			try {
				notes = selectNotes(knowledgeDir, query, {
					all: opts.all,
					limit: Number.parseInt(opts.limit, 10),
					sessionStart: opts.sessionStart,
					tag: opts.tag,
					type: opts.type,
				});
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			if (notes.length === 0) {
				console.log('No matching notes.');
				return;
			}

			const label = opts.sessionStart ? 'session context' : (query ?? 'all');
			console.log(`# Knowledge: ${label} (${notes.length} notes · ${today})`);
			for (const n of notes) {
				const tags = (n.meta.tags ?? []).join(', ');
				console.log(`\n---\n### [${n.meta.title ?? '(untitled)'}] · ${n.meta.type} · ${n.meta.status}\n\`${n.path}\`${tags ? '\n**tags:** ' + tags : ''}\n`);
				const ex = excerpt(n);
				if (ex) {
					console.log(ex);
				}
			}
		});
}
