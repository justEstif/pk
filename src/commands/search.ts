import type {Command} from 'commander';
import {search} from '../lib/db.ts';
import {writeEvent} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerSearch(program: Command): void {
	program
		.command('search <query>')
		.description('Search knowledge notes via FTS5 BM25')
		.option('--type <type>', 'Filter by note type')
		.option('--status <status>', 'Filter by status')
		.option('--tag <tag>', 'Filter by tag')
		.option('--limit <n>', 'Max results', '10')
		.option('--context', 'Include full note body in output')
		.option('--pretty', 'Human-readable output')
		.action(runDir(async (dir, query: string, opts: {status: string; tag: string; type: string; limit: string; pretty?: boolean; context: boolean}) => {
			const results = search(dir, query, {
				filterStatus: opts.status,
				filterTag: opts.tag,
				filterType: opts.type,
				limit: Number.parseInt(opts.limit, 10),
			});

			await writeEvent(dir, 'search', {query, results: String(results.length)}).catch(() => {/* best-effort */});

			if (!opts.pretty) {
				writeJson({results});
				return;
			}

			if (results.length === 0) {
				console.log('No results.');
				return;
			}

			// Prefetch context bodies concurrently to avoid await-in-loop
			const bodies = opts.context
				? await Promise.all(results.map(async r => Bun.file(r.path).text().catch(() => '')))
				: [];

			for (const [i, r] of results.entries()) {
				const tags = r.tags.join(', ');
				console.log(`${r.path} | ${r.type} | ${r.status} | ${r.id} | ${r.title}${tags ? ' | ' + tags : ''}`);
				if (r.snippet) {
					console.log(`  ${r.snippet}`);
				}

				if (opts.context && bodies[i]) {
					console.log(bodies[i]);
					console.log('---');
				}
			}
		}));
}
