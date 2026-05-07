import type {Command} from 'commander';
import {formatSynthesizeOutput, selectNotes} from '../lib/synthesize.ts';

function knowledgeDir(): string {
	const dir = process.env.PK_KNOWLEDGE_DIR;
	if (!dir) {
		console.error('PK_KNOWLEDGE_DIR is not set. Run: pk init <name> --harness <harness>');
		process.exit(1);
	}

	return dir;
}

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
			const dir = knowledgeDir();

			let notes;
			try {
				notes = selectNotes(dir, query, {
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
			console.log(formatSynthesizeOutput(notes, label));
		});
}
