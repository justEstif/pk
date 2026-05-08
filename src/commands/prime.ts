import path from 'node:path';
import type {Command} from 'commander';

function skillPath(): string {
	return path.resolve(import.meta.dir, '..', 'skill', 'SKILL.md');
}

export function registerPrime(program: Command): void {
	program
		.command('prime')
		.description('Print the pk skill to stdout — used by harness adapters to inject into system prompt at session start')
		.action(async () => {
			const text = await Bun.file(skillPath()).text();
			// Strip YAML frontmatter before outputting
			process.stdout.write(text.replace(/^---[\s\S]*?---\n/v, ''));
		});
}
