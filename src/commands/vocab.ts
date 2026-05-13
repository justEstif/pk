import type { Command } from 'commander';
import { vocab } from '../lib/db.ts';
import { runDir, writeJson } from '../lib/runner.ts';

export function registerVocab(program: Command): void {
   program
      .command('vocab')
      .description('List tags in the knowledge base by frequency')
      .option('--pretty', 'Human-readable output')
      .action(runDir('vocab', (dir, opts: { pretty?: boolean }) => {
         const tags = vocab(dir);

         if (opts.pretty) {
            if (tags.length === 0) {
               console.log('No tags found.');
               return;
            }

            for (const { tag, count } of tags) {
               console.log(`${tag} (${count})`);
            }

            return;
         }

         writeJson({ tags });
      }));
}
