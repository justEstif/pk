import type {Command} from 'commander';
import {getHistory, formatHistory} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerHistory(program: Command): void {
	program
		.command('history')
		.description('View knowledge history')
		.option('-n, --limit <number>', 'Number of entries to show', '20')
		.option('--type <type>', 'Filter by type: commits, notes, or all', 'all')
		.option('--filter-type <type>', 'Filter by note type: note, decision, question, source')
		.option('--filter-tag <tag>', 'Filter by tag')
		.option('--filter-operation <operation>', 'Filter by operation: create, update, delete')
		.option('--json', 'JSON output')
		.action(runDir(async (dir, options: {
			limit: string;
			type: string;
			filterType?: string;
			filterTag?: string;
			filterOperation?: string;
			json?: boolean;
		}) => {
			const limit = Number.parseInt(options.limit, 10);
			const history = await getHistory(dir, {
				limit,
				type: options.type as 'commits' | 'notes' | 'all',
				filterType: options.filterType as 'note' | 'decision' | 'question' | 'source' | undefined,
				filterTag: options.filterTag,
				filterOperation: options.filterOperation as 'create' | 'update' | 'delete' | undefined,
			});

			if (options.json) {
				writeJson({entries: history});
				return;
			}

			if (history.length === 0) {
				console.log('No history found.');
				return;
			}

			console.log(formatHistory(history));
		}));
}
