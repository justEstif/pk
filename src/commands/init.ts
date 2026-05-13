import os from 'node:os';
import path from 'node:path';
import {$} from 'bun';
import * as p from '@clack/prompts';
import type {Command} from 'commander';
import {listExistingProjects, pkHome} from '../lib/paths.ts';
import {
	type Harness,
	HARNESSES,
	initializeProject,
	parseHarnesses,
} from '../lib/project.ts';

async function requireGit(): Promise<void> {
	try {
		await $`git --version`.quiet();
	} catch {
		console.error('pk requires git. Install it from https://git-scm.com and ensure it is on PATH.');
		process.exit(1);
	}
}

function failInit(error: unknown): never {
	console.error(String(error));
	process.exit(1);
}

// ─── registerInit ─────────────────────────────────────────────────────────────

export function registerInit(program: Command): void {
	program
		.command('init [name]')
		.description('Set up a pk knowledge project and wire it to your agent harness(es)')
		.option(
			'--harness <harnesses>',
			`Comma-separated harnesses: ${HARNESSES.map(h => h.value).join(', ')}`,
		)
		.option('--global', 'Store knowledge in ~/.pk/<name>/ instead of ./.pk/')
		.action(async (nameArg: string | undefined, opts: {harness?: string; global?: boolean}) => {
			await requireGit();

			const projectRoot = process.cwd();
			const home = os.homedir();
			const isGlobal = opts.global ?? false;

			// ── Validate harness flag early if provided ───────────────────────
			let flagHarnesses: Harness[] | undefined;
			if (opts.harness) {
				const result = parseHarnesses(opts.harness);
				if (typeof result === 'string') {
					console.error(result);
					process.exit(1);
				}

				flagHarnesses = result;
			}

			// ── Non-interactive path ──────────────────────────────────────────
			// Global requires explicit name; local uses dirname
			const impliedName = path.basename(projectRoot);

			if (isGlobal && nameArg && flagHarnesses) {
				try {
					const {lines} = await initializeProject({
						global: true,
						harnesses: flagHarnesses,
						home,
						name: nameArg,
						projectRoot,
					});
					console.log(lines.join('\n'));
				} catch (error) {
					failInit(error);
				}

				return;
			}

			if (!isGlobal && flagHarnesses) {
				try {
					const {lines} = await initializeProject({
						global: false,
						harnesses: flagHarnesses,
						home,
						name: nameArg ?? impliedName,
						projectRoot,
					});
					console.log(lines.join('\n'));
				} catch (error) {
					failInit(error);
				}

				return;
			}

			// ── Interactive path ───────────────────────────────────────────────
			p.intro('pk init');

			// Step 1: name — only needed for global mode
			let name: string;
			if (!isGlobal) {
				name = nameArg ?? impliedName;
			} else if (nameArg) {
				name = nameArg;
			} else {
				const existing = listExistingProjects();
				const choices: Array<{value: string; label: string; hint?: string}> = [
					...existing.map(n => ({hint: pkHome() + '/' + n, label: n, value: n})),
					{label: '+ New project', value: '__new__'},
				];

				const picked = await p.select({message: 'Project', options: choices});
				if (p.isCancel(picked)) {
					p.cancel('Cancelled.');
					process.exit(0);
				}

				if (picked === '__new__') {
					const typed = await p.text({
						message: 'Project name',
						placeholder: 'my-project',
						initialValue: impliedName,
						validate(v) {
							if (!v?.trim()) {
								return 'Name is required';
							}

							if (!/^[\w.\-]+$/v.test(v)) {
								return 'Use letters, numbers, hyphens, dots only';
							}
						},
					});
					if (p.isCancel(typed)) {
						p.cancel('Cancelled.');
						process.exit(0);
					}

					name = typed;
				} else {
					name = picked;
				}
			}

			// Step 2: harnesses
			let harnesses: Harness[];
			if (flagHarnesses) {
				harnesses = flagHarnesses;
			} else {
				const picked = await p.multiselect<Harness>({
					message: 'Harnesses (space to toggle, enter to confirm)',
					options: HARNESSES.map(h => ({hint: h.hint, label: h.label, value: h.value})),
					required: true,
				});
				if (p.isCancel(picked)) {
					p.cancel('Cancelled.');
					process.exit(0);
				}

				harnesses = picked;
			}

			// ── Apply ──────────────────────────────────────────────────────────
			try {
				const {lines} = await initializeProject({
					global: isGlobal,
					harnesses,
					home,
					name,
					projectRoot,
				});
				p.outro(lines.join('\n'));
			} catch (error) {
				failInit(error);
			}
		});
}
