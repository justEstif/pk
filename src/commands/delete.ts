import type { Command } from 'commander';
import { deleteKnowledgeNote } from '../lib/operations.ts';
import { runDir, writeJson } from '../lib/runner.ts';

export function registerDelete(program: Command): void {
   program
      .command('delete')
      .description('Delete a knowledge note')
      .argument('<path>', 'Path to the note file')
      .option('-y, --yes', 'Skip confirmation prompt')
      .option('--pretty', 'Human-readable output')
      .action(runDir('delete', async (dir, notePath: string, options: { yes?: boolean; pretty?: boolean }) => {
         // JSON/machine mode skips confirmation always; --pretty mode respects --yes flag.
         if (options.pretty && !options.yes) {
            const confirmed = await confirmDeletion(notePath);
            if (!confirmed) {
               console.log('Aborted.');
               process.exit(0);
            }
         }

         const fullPath = await deleteKnowledgeNote(dir, notePath);

         if (options.pretty) {
            console.log(`Deleted: ${fullPath}`);
         } else {
            writeJson({ path: fullPath, status: 'deleted' });
         }
      }));
}

async function confirmDeletion(notePath: string): Promise<boolean> {
   console.log(`Deleting: ${notePath}`);
   console.log('This action cannot be undone (but you can recover from git).');
   process.stdout.write('Delete this note? (y/N): ');
   const chunks: Uint8Array[] = [];
   for await (const chunk of process.stdin as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
      if (new TextDecoder().decode(chunk).includes('\n')) {
         break;
      }
   }

   const total = chunks.reduce((s, c) => s + c.byteLength, 0);
   const buf = new Uint8Array(total);
   let off = 0;
   for (const c of chunks) {
      buf.set(c, off);
      off += c.byteLength;
   }

   return new TextDecoder().decode(buf).trim().toLowerCase() === 'y';
}
