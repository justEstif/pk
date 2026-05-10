import type {Command} from 'commander';
import {search, semanticSearch, hasVectors} from '../lib/db.ts';
import {loadConfig} from '../lib/config.ts';
import {getProvider} from '../lib/embedding.ts';
import {writeEvent} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerSearch(program: Command): void {
	program
		.command('search <query>')
		.description('Search knowledge notes via FTS5 BM25 (or semantic with --semantic)')
		.option('--type <type>', 'Filter by note type')
		.option('--status <status>', 'Filter by status')
		.option('--tag <tag>', 'Filter by tag')
		.option('--limit <n>', 'Max results', '10')
		.option('--context', 'Include full note body in output')
		.option('--semantic', 'Use vector similarity search (requires pk index with embeddings configured)')
		.option('--pretty', 'Human-readable output')
		.action(runDir(async (dir, query: string, opts: {status: string; tag: string; type: string; limit: string; pretty?: boolean; context: boolean; semantic?: boolean}) => {
			const limit = Number.parseInt(opts.limit, 10);

			if (opts.semantic) {
				if (!hasVectors(dir)) {
					console.error('No embeddings in index — configure embeddings and run: pk index');
					process.exit(1);
				}

				const config = await loadConfig();
				let provider;
				try {
					provider = getProvider(config.embedding);
				} catch (error) {
					console.error(`[pk] Embedding provider error: ${String(error)}`);
					process.exit(1);
				}

				if (!provider) {
					console.error('No embedding provider configured — run: pk config --embedding <model>');
					process.exit(1);
				}

				const embedResults = await provider.embed([query]);
				const queryVec = embedResults[0];
				if (!queryVec) {
					console.error('Embedding provider returned empty result.');
					process.exit(1);
				}

				const semResults = await semanticSearch(dir, queryVec, limit > 0 ? limit : 10);

				await writeEvent(dir, 'search', {query, mode: 'semantic', results: String(semResults.length)}).catch(() => {/* best-effort */});

				if (!opts.pretty) {
					writeJson({results: semResults});
					return;
				}

				if (semResults.length === 0) {
					console.log('No results.');
					return;
				}

				for (const r of semResults) {
					console.log(`${r.path} | score: ${r.score.toFixed(4)}`);
				}

				return;
			}

			const results = search(dir, query, {
				filterStatus: opts.status,
				filterTag: opts.tag,
				filterType: opts.type,
				limit,
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
