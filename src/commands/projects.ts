import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import type {Command} from 'commander';
import {listExistingProjects, pkHome} from '../lib/paths.ts';
import {writeJson} from '../lib/runner.ts';

export function registerProjects(program: Command): void {
	program
		.command('projects')
		.description('List all global projects')
		.option('--pretty', 'Human-readable output')
		.action((opts: {pretty?: boolean}) => {
			const home = pkHome();
			const projects = listExistingProjects();

			// Read current project from global config
			let currentProject: string | undefined;
			const configPath = path.join(home, 'config.json');
			if (existsSync(configPath)) {
				try {
					const config = JSON.parse(readFileSync(configPath, 'utf8')) as {currentProject?: string};
					currentProject = config.currentProject;
				} catch {/* ignore */}
			}

			if (opts.pretty) {
				if (projects.length === 0) {
					console.log('No global projects found. Run: pk init --global <name>');
					return;
				}

				for (const name of projects) {
					const marker = name === currentProject ? ' ← current' : '';
					console.log(`  ${name}${marker}`);
				}
			} else {
				writeJson({
					currentProject: currentProject ?? null,
					projects,
				});
			}
		});
}
