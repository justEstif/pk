import {
	existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import type {Command} from 'commander';
import {listExistingProjects, pkHome, projectDir} from '../lib/paths.ts';
import {writeJson} from '../lib/runner.ts';

export function registerUse(program: Command): void {
	program
		.command('use <name>')
		.description('Set the current global project')
		.option('--pretty', 'Human-readable output')
		.action((name: string, opts: {pretty?: boolean}) => {
			const home = pkHome();
			const targetDir = projectDir(name);

			if (!existsSync(targetDir)) {
				const available = listExistingProjects();
				const msg = available.length > 0
					? `Project "${name}" not found. Available: ${available.join(', ')}`
					: `Project "${name}" not found. No global projects exist yet. Run: pk init --global <name>`;
				console.error(msg);
				process.exit(1);
			}

			const configPath = path.join(home, 'config.json');
			mkdirSync(home, {recursive: true});

			let config: Record<string, unknown> = {};
			if (existsSync(configPath)) {
				try {
					config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
				} catch {/* overwrite */}
			}

			config.currentProject = name;
			writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

			if (opts.pretty) {
				console.log(`Switched to project: ${name}`);
			} else {
				writeJson({currentProject: name});
			}
		});
}
