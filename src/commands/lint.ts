import type {Command} from 'commander';
import {lintNotes} from '../lib/lint.ts';
import {findKnowledgeDir} from '../lib/paths.ts';

export function registerLint(program: Command): void {
	program
		.command('lint')
		.description('Validate knowledge notes structure and frontmatter')
		.action(() => {
			const knowledgeDir = findKnowledgeDir();
			const {issues, noteCount} = lintNotes(knowledgeDir);

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
