import type {Command} from 'commander';
import {formatSynthesizeOutput, selectNotes} from '../lib/synthesize.ts';
import {addSynthesizeNote} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';
import {excerpt} from '../lib/notes.ts';

export function registerSynthesize(program: Command): void {
	program
		.command('synthesize [query]')
		.description('Produce a ranked context dump of matching notes')
		.option('--all', 'Include all notes')
		.option('--type <type>', 'Filter by note type')
		.option('--tag <tag>', 'Filter by tag')
		.option('--limit <n>', 'Max notes', '10')
		.option('--session-start', 'Open questions + recent decisions + active notes')
		.option('--json', 'JSON output')
		.action(runDir(async (dir, query: string | undefined, opts: {sessionStart: boolean; all: boolean; type: string; tag: string; limit: string; json: boolean}) => {
			const notes = await selectNotes(dir, query, {
				all: opts.all,
				limit: Number.parseInt(opts.limit, 10),
				sessionStart: opts.sessionStart,
				tag: opts.tag,
				type: opts.type,
			});

			if (notes.length === 0) {
				if (opts.json) {
					writeJson({notes: [], label: opts.sessionStart ? 'session context' : (query ?? 'all')});
				} else {
					console.log('No matching notes.');
				}

				return;
			}

			const label = opts.sessionStart ? 'session context' : (query ?? 'all');

			if (opts.json) {
				const mappedNotes = notes.map(note => ({
					path: note.path,
					type: note.meta.type ?? '',
					status: note.meta.status ?? '',
					title: note.meta.title ?? '',
					tags: Array.isArray(note.meta.tags) ? note.meta.tags : [],
					excerpt: excerpt(note),
				}));
				writeJson({notes: mappedNotes, label});
				return;
			}

			console.log(formatSynthesizeOutput(notes, label));

			// Add git note for synthesize operation
			try {
				await addSynthesizeNote(dir, query ?? 'session-start');
			} catch {
				// Silently ignore git note errors - synthesize is the primary operation
			}
		}));
}
