import {readFileSync} from 'node:fs';
import type {Command} from 'commander';
import {search} from '../lib/db.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function registerSearch(program: Command): void {
	program
		.command('search <query>')
		.description('Search knowledge notes via FTS5 BM25')
		.option('--type <type>', 'Filter by note type')
		.option('--status <status>', 'Filter by status')
		.option('--tag <tag>', 'Filter by tag')
		.option('--limit <n>', 'Max results', '10')
		.option('--context', 'Include full note body in output')
		.option('--json', 'JSON output')
		.action((query: string, opts: {status: string; tag: string; type: string; limit: string; json: boolean; context: boolean}) => {
			let dir: string;
			try {
				dir = requireKnowledgeDir();
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			let results;
			try {
				results = search(dir, query, {
					filterStatus: opts.status,
					filterTag: opts.tag,
					filterType: opts.type,
					limit: Number.parseInt(opts.limit, 10),
				});
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			if (opts.json) {
				console.log(JSON.stringify(results, null, 2));
				return;
			}

			if (results.length === 0) {
				console.log('No results.');
				return;
			}

			for (const r of results) {
				const tags = r.tags.join(', ');
				console.log(`${r.path} | ${r.type} | ${r.status} | ${r.id} | ${r.title}${tags ? ' | ' + tags : ''}`);
				if (r.snippet) {
					console.log(`  ${r.snippet}`);
				}

				if (opts.context) {
					try {
						console.log(readFileSync(r.path, 'utf8'));
						console.log('---');
					} catch {}
				}
			}
		});
}
