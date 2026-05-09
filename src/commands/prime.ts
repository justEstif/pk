import type {Command} from 'commander';
import {pkInstruction, FORCED_EVAL_PROMPT} from '../lib/instruction.ts';
import {runDir} from '../lib/runner.ts';

export function registerPrime(program: Command): void {
	program
		.command('prime')
		.description('Print priming context for agent injection — used by hooks at session start')
		.action(runDir(dir => {
			const output = FORCED_EVAL_PROMPT + '\n\n' + pkInstruction(dir);
			process.stdout.write(output + '\n');
		}));
}
