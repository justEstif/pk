import type {Command} from 'commander';
import {search} from '../lib/db.ts';
import {allNotes, excerpt, validNotes} from '../lib/notes.ts';
import {findKnowledgeDir} from '../lib/paths.ts';

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
			if (opts.sessionStart) {
				const all = validNotes(knowledgeDir, ['index', 'source']);
				notes = all.filter(n =>
					n.meta.status === 'open' || n.meta.status === 'accepted' || n.meta.status === 'active').slice(0, Number.parseInt(opts.limit, 10));
			} else if (opts.all) {
				notes = validNotes(knowledgeDir, ['index']).slice(0, Number.parseInt(opts.limit, 10));
			} else if (query) {
				let results;
				try {
					results = search(knowledgeDir, query, {filterTag: opts.tag, filterType: opts.type, limit: Number.parseInt(opts.limit, 10)});
				} catch (error) {
					console.error(String(error));
					process.exit(1);
				}

				const byPath = new Map(allNotes(knowledgeDir).map(n => [n.path, n]));
				notes = results.map(r => byPath.get(r.path)).filter(Boolean);
			} else {
				console.error('Provide a query or --all');
				process.exit(1);
			}

			if (!notes || notes.length === 0) {
				console.log('No matching notes.');
				return;
			}

			const label = opts.sessionStart ? 'session context' : (query ?? 'all');
			console.log(`# Knowledge: ${label} (${notes.length} notes · ${today})`);
			for (const n of notes) {
				if (!n) {
					continue;
				}

				const tags = (n.meta.tags ?? []).join(', ');
				console.log(`\n---\n### [${n.meta.title ?? '(untitled)'}] · ${n.meta.type} · ${n.meta.status}\n\`${n.path}\`${tags ? '\n**tags:** ' + tags : ''}\n`);
				const ex = excerpt(n);
				if (ex) {
					console.log(ex);
				}
			}
		});
}
