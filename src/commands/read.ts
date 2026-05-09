import path from 'node:path';
import type {Command} from 'commander';
import {runDir, writeJson} from '../lib/runner.ts';

export function registerRead(program: Command): void {
	program
		.command('read <path>')
		.description('Read the full content of a knowledge note')
		.option('--pretty', 'Human-readable output')
		.action(runDir(async (dir, notePath: string, opts: {pretty?: boolean}) => {
			const fullPath = notePath.startsWith('/') ? notePath : path.join(dir, notePath);

			if (!fullPath.startsWith(dir)) {
				throw new Error(`Path must be inside the knowledge directory: ${dir}`);
			}

			const text = await Bun.file(fullPath).text();

			if (opts.pretty) {
				console.log(text);
			} else {
				writeJson({path: fullPath, content: text});
			}
		}));
}
