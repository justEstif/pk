import type {Command} from 'commander';
import {formatSynthesizeOutput, selectNotes} from '../lib/synthesize.ts';
import {writeEvent, getRecentEvents} from '../lib/git.ts';
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
		.option('--pretty', 'Human-readable output')
		.action(runDir('synthesize', async (dir, query: string | undefined, opts: {sessionStart: boolean; all: boolean; type: string; tag: string; limit: string; pretty?: boolean}) => {
			const notes = await selectNotes(dir, query, {
				all: opts.all,
				limit: Number.parseInt(opts.limit, 10),
				sessionStart: opts.sessionStart,
				tag: opts.tag,
				type: opts.type,
			});

			if (notes.length === 0) {
				if (opts.pretty) {
					console.log('No matching notes.');
				} else {
					writeJson({notes: [], label: opts.sessionStart ? 'session context' : (query ?? 'all')});
				}

				return;
			}

			const label = opts.sessionStart ? 'session context' : (query ?? 'all');

			if (opts.pretty) {
				const events = await getRecentEvents(dir, 10).catch(() => []);
				console.log(formatSynthesizeOutput(notes, label, events));

				// Record synthesize event
				await writeEvent(dir, 'synthesize', {query: query ?? 'session-start', notes: String(notes.length)}).catch(() => {/* best-effort */});

				return;
			}

			const mappedNotes = notes.map(note => ({
				path: note.path,
				type: note.meta.type ?? '',
				status: note.meta.status ?? '',
				title: note.meta.title ?? '',
				tags: Array.isArray(note.meta.tags) ? note.meta.tags : [],
				excerpt: excerpt(note),
			}));
			writeJson({notes: mappedNotes, label});
		}));
}
