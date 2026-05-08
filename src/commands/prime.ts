import type {Command} from 'commander';
import {requireKnowledgeDir} from '../lib/paths.ts';
import {pkInstruction, FORCED_EVAL_PROMPT} from './harnesses/shared.ts';

export function registerPrime(program: Command): void {
	program
		.command('prime')
		.description('Print priming context for agent injection — used by hooks at session start')
		.action(() => {
			const knowledgeDir = requireKnowledgeDir();
			const output = FORCED_EVAL_PROMPT + '\n\n' + pkInstruction(knowledgeDir);
			process.stdout.write(output + '\n');
		});
}
