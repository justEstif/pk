import process from 'node:process';
import type {Command} from 'commander';

const guides: Record<string, string> = {
	new: 'pk new note|decision|question|source "Title" --tags tag1,tag2\nSearch first: pk search <query>. Creates knowledge/<type>s/YYYY-MM-DD-slug.md.',
	search:
      'pk search <query> [--type] [--status] [--tag] [--context] [--limit]\nBM25 ranked FTS5. Requires pk index to have been run first.',
	synthesize:
      'pk synthesize [query] [--all] [--session-start] [--limit]\nProduces ranked context block. --session-start injects open questions + accepted decisions + active notes.',
	index:
      'pk index\nRebuilds FTS5 index (~/.pk/<name>/.index.db) and markdown index files (~/.pk/<name>/indexes/). Run after any note change.',
	lint: 'pk lint\nValidates frontmatter, required sections, file location, ID uniqueness, tag format, length limits.',
	// eslint-disable-next-line @stylistic/max-len
	init: 'pk init [<name>] [--harness <harness>]\nInteractive when args omitted. Creates ~/.pk/<name>/ knowledge base, configures hooks, installs skill.\nDetects existing projects and connects without recreating.\nHarnesses: claude, opencode, pi.',
	config:
      'pk config [--embedding model] [--no-embedding]\nShows or updates pk configuration. Embedding config shape: {embedding:{enabled,provider,model}}.',
};
export function registerInstructions(program: Command): void {
	program
		.command('instructions <command>')
		.description('Show behavioral guide for a command')
		.action((cmd: string) => {
			const guide = guides[cmd];
			if (!guide) {
				console.error(`No guide for '${cmd}'. Available: ${Object.keys(guides).join(', ')}`);
				process.exitCode = 1;
				return;
			}

			console.log(guide);
		});
}
