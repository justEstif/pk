import path from 'node:path';
import type {Command} from 'commander';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerRead(program: Command): void {
	program
		.command('read <path>')
		.description('Read the full content of a knowledge note')
		.option('--json', 'JSON output')
		.action(runDir(async (dir, notePath: string, opts: {json?: boolean}) => {
			const fullPath = notePath.startsWith('/') ? notePath : path.join(dir, notePath);

			if (!fullPath.startsWith(dir)) {
				throw new Error(`Path must be inside the knowledge directory: ${dir}`);
			}

			const text = await Bun.file(fullPath).text();

			if (opts.json) {
				writeJson({path: fullPath, content: text});
			} else {
				console.log(text);
			}
		}));
}
