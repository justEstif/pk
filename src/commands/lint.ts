import type {Command} from 'commander';
import {lintNotes} from '../lib/lint.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function registerLint(program: Command): void {
	program
		.command('lint')
		.description('Validate knowledge notes structure and frontmatter')
		.action(async () => {
			let dir: string;
			try {
				dir = requireKnowledgeDir();
			} catch (error) {
				console.error(String(error));
				process.exit(1);
			}

			const {issues, noteCount} = await lintNotes(dir);

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
		});
}
