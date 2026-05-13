import path from 'node:path';
import type {Command} from 'commander';
import {updateKnowledgeNote} from '../lib/operations.ts';
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
		.action(runDir('write', async (dir, notePath: string, opts: {pretty?: boolean}) => {
			const fullPath = notePath.startsWith('/') ? notePath : path.join(dir, notePath);
			const content = await readStdin();
			await updateKnowledgeNote(dir, fullPath, content);

			if (opts.pretty) {
				console.log(`Updated: ${fullPath}`);
				return;
			}

			writeJson({path: fullPath});
		}));
}
