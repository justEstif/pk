import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {$} from 'bun';
import * as p from '@clack/prompts';
import type {Command} from 'commander';
import {listExistingProjects, pkHome} from '../lib/paths.ts';
import {
	type Harness,
	type HarnessContext,
	applyHarnesses,
	buildOutro,
	ensureProject,
	HARNESSES,
	HARNESS_VALUES,
	HARNESS_ACTIVATION,
	parseHarnesses,
} from '../lib/project.ts';

export type {Harness, HarnessContext} from '../lib/project.ts';

/**
 * Check that git is available on PATH.
 * Exits with error if not found.
 */
async function requireGit(): Promise<void> {
	try {
		await $`git --version`.quiet();
	} catch {
		console.error('pk requires git. Install it from https://git-scm.com and ensure it is on PATH.');
		process.exit(1);
	}
}

async function safeEnsureProject(name: string): Promise<{created: boolean; knowledgeDir: string}> {
	try {
		return await ensureProject(name);
	} catch (error: unknown) {
		console.error(String(error));
		process.exit(1);
	}
}

/**
 * Ensure git repo exists in the knowledge directory.
 * Runs on first creation and on re-init if .git is missing.
 */
async function ensureGitRepo(created: boolean, knowledgeDir: string): Promise<void> {
	if (!created && existsSync(path.join(knowledgeDir, '.git'))) {
		return;
	}

	try {
		const {initRepo} = await import('../lib/git.ts');
		await initRepo(knowledgeDir);
	} catch (error) {
		console.error(`[pk] Failed to initialize git repo: ${String(error)}`);
		process.exit(1);
	}
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
		.action(async (nameArg: string | undefined, opts: {harness?: string}) => {
			await requireGit();

			const projectRoot = process.cwd();
			const home = os.homedir();
			const existing = listExistingProjects();

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

			// ── Non-interactive path: both args supplied ───────────────────────
			if (nameArg && flagHarnesses) {
				const {created, knowledgeDir} = await safeEnsureProject(nameArg);
				await ensureGitRepo(created, knowledgeDir);

				const ctx = {
					home, knowledgeDir, name: nameArg, projectRoot,
				};
				await applyHarnesses(flagHarnesses, ctx);
				console.log(buildOutro(created, knowledgeDir, flagHarnesses).join('\n'));
				return;
			}

			// ── Interactive path ───────────────────────────────────────────────
			p.intro('pk init');

			// Step 1: project name
			let name: string;
			if (nameArg) {
				name = nameArg;
			} else {
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
						validate(v) {
							if (!v?.trim()) {
								return 'Name is required';
							}

							if (!/^[\w.-]+$/v.test(v)) {
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

			// Step 2: harnesses (multiselect)
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
			const {created, knowledgeDir} = await safeEnsureProject(name);
			await ensureGitRepo(created, knowledgeDir);

			const ctx = {
				home, knowledgeDir, name, projectRoot,
			};
			await applyHarnesses(harnesses, ctx);

			p.outro(buildOutro(created, knowledgeDir, harnesses).join('\n'));
		});
}
