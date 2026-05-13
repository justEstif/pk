import type { Command } from 'commander';
import { createKnowledgeNote } from '../lib/operations.ts';
import { runDir, writeJson } from '../lib/runner.ts';

export function registerNew(program: Command): void {
   program
      .command('new <type> <title>')
      .description('Create a new knowledge note')
      .option('--tags <tags>', 'Comma-separated tags', '')
      .option('--pretty', 'Human-readable output')
      .action(runDir('new', async (dir, type: string, title: string, opts: { tags: string; pretty?: boolean }) => {
         const notePath = await createKnowledgeNote(dir, type, title, opts.tags);

         if (opts.pretty) {
            console.log(notePath);
            return;
         }

         writeJson({ path: notePath });
      }));
}
