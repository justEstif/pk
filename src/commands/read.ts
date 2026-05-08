import path from 'node:path';
import type {Command} from 'commander';
import {requireKnowledgeDir} from '../lib/paths.ts';
import {writeJson} from '../lib/json-output.ts';

export function registerRead(program: Command): void {
	program
		.command('read <path>')
		.description('Read the full content of a knowledge note')
		.option('--json', 'JSON output')
		.action(async (notePath: string, opts: {json?: boolean}) => {
			const dir = requireKnowledgeDir();
			const fullPath = notePath.startsWith('/') ? notePath : path.join(dir, notePath);

			if (!fullPath.startsWith(dir)) {
				console.error(`Error: Path must be inside the knowledge directory: ${dir}`);
				process.exit(1);
			}

			let text: string;
			try {
				text = await Bun.file(fullPath).text();
			} catch {
				console.error(`Error: File not found: ${fullPath}`);
				process.exit(1);
			}

			if (opts.json) {
				writeJson({path: fullPath, content: text});
			} else {
				console.log(text);
			}
		});
}
