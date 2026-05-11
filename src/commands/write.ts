import path from 'node:path';
import type {Command} from 'commander';
import {commitKnowledgeFile} from '../lib/git.ts';
import {runDir, writeJson} from '../lib/runner.ts';

async function readStdin(): Promise<string> {
	const chunks: Uint8Array[] = [];
	for await (const chunk of process.stdin as unknown as AsyncIterable<Uint8Array>) {
		chunks.push(chunk);
	}

	const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
	const buf = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		buf.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return new TextDecoder().decode(buf);
}

export function registerWrite(program: Command): void {
	program
		.command('write <path>')
		.description('Write content to an existing knowledge note and commit the update')
		.option('--pretty', 'Human-readable output')
		.action(runDir(async (dir, notePath: string, opts: {pretty?: boolean}) => {
			const fullPath = notePath.startsWith('/') ? notePath : path.join(dir, notePath);

			const file = Bun.file(fullPath);
			if (!(await file.exists())) {
				throw new Error(`Note not found: ${fullPath}. Use 'pk new' to create.`);
			}

			const sep = dir.endsWith(path.sep) ? dir : dir + path.sep;
			if (!fullPath.startsWith(sep)) {
				throw new Error(`Path must be within knowledge directory: ${dir}`);
			}

			const content = await readStdin();
			await Bun.write(fullPath, content);
			await commitKnowledgeFile(fullPath, 'update');

			if (opts.pretty) {
				console.log(`Updated: ${fullPath}`);
				return;
			}

			writeJson({path: fullPath});
		}));
}
