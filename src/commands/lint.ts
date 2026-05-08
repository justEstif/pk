import type {Command} from 'commander';
import {lintNotes} from '../lib/lint.ts';
import {writeJson} from '../lib/json-output.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function registerLint(program: Command): void {
	program
		.command('lint [paths...]')
		.description('Validate knowledge notes structure and frontmatter')
		.option('--json', 'JSON output')
		.action(async (paths: string[] | undefined, opts: {json?: boolean}) => {
			let dir: string;
			try {
				dir = requireKnowledgeDir();
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			const resolved = paths?.length
				? paths.map(p => p.startsWith('/') ? p : `${dir}/${p}`)
				: undefined;
			const {issues, noteCount} = await lintNotes(dir, resolved);

			if (opts.json) {
				writeJson({issues, noteCount});
			} else {
				let hasError = false;
				for (const {level, path: p, message} of issues) {
					const prefix = level === 'error' ? 'ERROR' : 'WARN ';
					const out = level === 'error' ? process.stderr : process.stdout;
					out.write(`${prefix} ${p}: ${message}\n`);
					if (level === 'error') {
						hasError = true;
					}
				}

				if (hasError) {
					process.exit(1);
				} else {
					console.log(`lint passed (${noteCount} files, ${issues.filter(i => i.level === 'warn').length} warnings)`);
				}
			}
		});
}
