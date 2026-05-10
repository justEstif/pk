import type {Command} from 'commander';
import {
	search, hybridSearch, semanticSearch, hasVectors,
} from '../lib/db.ts';
import {loadConfig} from '../lib/config.ts';
import {getProvider} from '../lib/embedding.ts';
import {writeEvent} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

async function resolveProvider(dir: string) {
	if (!hasVectors(dir)) {
		return undefined;
	}

	const config = await loadConfig();
	try {
		return getProvider(config.embedding);
	} catch {
		return undefined;
	}
}

export function registerSearch(program: Command): void {
	program
		.command('search <query>')
		.description('Search knowledge notes. Hybrid (BM25 + vector) when embeddings are indexed, keyword-only otherwise.')
		.option('--type <type>', 'Filter by note type')
		.option('--status <status>', 'Filter by status')
		.option('--tag <tag>', 'Filter by tag')
		.option('--limit <n>', 'Max results', '10')
		.option('--context', 'Include full note body in output')
		.option('--semantic', 'Pure vector search (requires embeddings configured and pk index run)')
		.option('--pretty', 'Human-readable output')
		.action(runDir(async (dir, query: string, opts: {status: string; tag: string; type: string; limit: string; pretty?: boolean; context: boolean; semantic?: boolean}) => {
			const limit = Number.parseInt(opts.limit, 10);
			const provider = await resolveProvider(dir);

			// Pure semantic mode (explicit flag)
			if (opts.semantic) {
				if (!provider) {
					console.error('No embeddings in index — configure embeddings and run: pk index');
					process.exit(1);
				}

				const [queryVec] = await provider.embed([query]);
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

			// Hybrid: BM25 + vector fused via RRF (when vectors available)
			if (provider) {
				const [queryVec] = await provider.embed([query]);
				if (queryVec) {
					const results = await hybridSearch(dir, query, queryVec, {
						limit: limit > 0 ? limit : 10,
						filterStatus: opts.status,
						filterTag: opts.tag,
						filterType: opts.type,
					});
					await writeEvent(dir, 'search', {query, mode: 'hybrid', results: String(results.length)}).catch(() => {/* best-effort */});
					await printResults(results, opts);
					return;
				}
			}

			// Keyword-only fallback
			const results = search(dir, query, {
				filterStatus: opts.status,
				filterTag: opts.tag,
				filterType: opts.type,
				limit,
			});
			await writeEvent(dir, 'search', {query, results: String(results.length)}).catch(() => {/* best-effort */});
			await printResults(results, opts);
		}));
}

type PrintableResult = {path: string; type: string; status: string; id: string; title: string; tags: string[]; snippet?: string};

async function printResults(results: PrintableResult[], opts: {pretty?: boolean; context: boolean; limit: string}) {
	if (!opts.pretty) {
		writeJson({results});
		return;
	}

	if (results.length === 0) {
		console.log('No results.');
		return;
	}

	const bodies = opts.context
		? await Promise.all(results.map(async r => Bun.file(r.path).text().catch(() => '')))
		: [];

	for (const [i, r] of results.entries()) {
		const tags = r.tags.join(', ');
		console.log(`${r.path} | ${r.type} | ${r.status} | ${r.id} | ${r.title}${tags ? ` | ${tags}` : ''}`);
		if (r.snippet) {
			console.log(`  ${r.snippet}`);
		}

		if (opts.context && bodies[i]) {
			console.log(bodies[i]);
			console.log('---');
		}
	}
}
