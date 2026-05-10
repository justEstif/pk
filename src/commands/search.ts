import type {Command} from 'commander';
import {executeSearch, type SearchExecutionResult} from '../lib/db.ts';
import {loadConfig} from '../lib/config.ts';
import {getProvider} from '../lib/embedding.ts';
import {writeEvent} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

async function resolveProvider() {
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
			const provider = await resolveProvider();
			let execution: SearchExecutionResult;
			try {
				execution = await executeSearch(dir, query, {
					provider,
					semantic: opts.semantic,
					filterStatus: opts.status,
					filterTag: opts.tag,
					filterType: opts.type,
					limit,
				});
			} catch (error) {
				console.error(error instanceof Error ? error.message : String(error));
				process.exit(1);
			}

			await writeEvent(dir, 'search', {
				query,
				...(execution.mode === 'keyword' ? {} : {mode: execution.mode}),
				results: String(execution.results.length),
			}).catch(() => {/* best-effort */});

			if (execution.mode === 'semantic') {
				printSemanticResults(execution.results, opts);
				return;
			}

			await printResults(execution.results, opts);
		}));
}

type PrintableSemanticResult = {path: string; score: number};

type PrintableResult = {path: string; type: string; status: string; id: string; title: string; tags: string[]; snippet?: string};

function printSemanticResults(results: PrintableSemanticResult[], opts: {pretty?: boolean}) {
	if (!opts.pretty) {
		writeJson({results});
		return;
	}

	if (results.length === 0) {
		console.log('No results.');
		return;
	}

	for (const r of results) {
		console.log(`${r.path} | score: ${r.score.toFixed(4)}`);
	}
}

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
