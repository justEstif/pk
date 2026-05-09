import type {Command} from 'commander';
import {pkInstruction, FORCED_EVAL_PROMPT} from '../lib/instruction.ts';
import {writeEvent} from '../lib/git.ts';
import {runDir} from '../lib/runner.ts';

export function registerPrime(program: Command): void {
	program
		.command('prime')
		.description('Print priming context for agent injection — used by hooks at session start')
		.action(runDir(async dir => {
			await writeEvent(dir, 'session-open').catch(() => {/* best-effort */});
			const output = FORCED_EVAL_PROMPT + '\n\n' + pkInstruction(dir);
			process.stdout.write(output + '\n');
		}));
}
