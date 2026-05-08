import path from 'node:path';
import { $ } from 'bun';
import type { Config } from './config.ts';

export type HistoryOptions = {
   limit?: number;
   type?: 'commits' | 'notes' | 'all';
   filterType?: 'note' | 'decision' | 'question' | 'source';
   filterTag?: string;
   filterOperation?: 'create' | 'update' | 'delete';
};

export type HistoryEntry = {
   hash: string;
   timestamp: string;
   message: string;
   type: 'commit' | 'note';
   noteType?: string;
   operation?: string;
   tags?: string[];
};

type ParsedCommit = {
   operation: string;
   noteType: string;
   title: string;
   tags?: string[];
};

/**
 * Initialize a git repository in the knowledge directory.
 * Creates an initial commit with .gitignore and initializes git notes.
 */
export async function initRepo(knowledgeDir: string): Promise<void> {
   // Initialize git repo
   const initResult = await $`git -C ${knowledgeDir} init`.quiet();
   if (initResult.exitCode !== 0) {
      throw new Error(`Git init failed: ${initResult.stderr.toString()}`);
   }

   // Create .gitignore if it doesn't exist
   const gitignorePath = path.join(knowledgeDir, '.gitignore');
   const ignoreContent = '*.db\n*.db-shm\n*.db-wal\nnode_modules\n';
   await Bun.write(gitignorePath, ignoreContent);

   // Initial commit
   await $`git -C ${knowledgeDir} add .`.quiet();
   await $`git -C ${knowledgeDir} commit -m "pk: initialize knowledge base"`.quiet();

   // Initialize git notes ref (will fail if no HEAD, but we just committed)
   await $`git -C ${knowledgeDir} notes add`.quiet().catch(() => {
      // Ignore failure - notes ref will be created on first use
   });
}

/**
 * Commit a knowledge file with a structured message.
 */
export async function commitKnowledgeFile(
   filePath: string,
   operation: 'intake' | 'update',
   config: Config,
): Promise<void> {
   if (!config.auto_commit) {
      return;
   }

   const knowledgeDir = path.dirname(filePath);
   const title = extractTitleFromPath(filePath);
   const message = `knowledge: ${operation} ${title}`;

   try {
      await $`git -C ${knowledgeDir} add ${filePath}`.quiet();
      await $`git -C ${knowledgeDir} commit -m ${message}`.quiet();
   } catch (error) {
      console.warn(`[pk] Git commit failed: ${String(error)}`);
   }
}

/**
 * Commit the deletion of a knowledge file.
 */
export async function commitDelete(
   knowledgeDir: string,
   notePath: string,
   config: Config,
): Promise<void> {
   if (!config.auto_commit) {
      return;
   }

   const title = extractTitleFromPath(notePath);
   const message = `knowledge: delete ${title}`;

   try {
      await $`git -C ${knowledgeDir} add ${notePath}`.quiet();
      await $`git -C ${knowledgeDir} commit -m ${message}`.quiet();
   } catch (error) {
      console.warn(`[pk] Git commit failed: ${String(error)}`);
   }
}

/**
 * Add a git note for a synthesize operation.
 */
export async function addSynthesizeNote(
   knowledgeDir: string,
   query: string,
   config: Config,
): Promise<void> {
   if (!config.auto_commit) {
      return;
   }

   const timestamp = new Date().toISOString();
   const noteContent = `pk synthesize\nQuery: ${query}\nTimestamp: ${timestamp}`;

   try {
      await $`git -C ${knowledgeDir} notes add -m ${noteContent}`.quiet();
   } catch (error) {
      console.warn(`[pk] Failed to add git note: ${String(error)}`);
   }
}

/**
 * Get git history with filtering support.
 */
export async function getHistory(
   knowledgeDir: string,
   opts: HistoryOptions,
): Promise<HistoryEntry[]> {
   const limit = opts.limit ?? 20;

   // Get raw git log with notes
   const result = await $`git -C ${knowledgeDir} log --show-notes=refs/notes/commits -n ${limit * 2} --format=%H|%ai|%s`.quiet();
   const lines = result.stdout.toString().trim().split('\n');

   const entries: HistoryEntry[] = [];
   for (const line of lines) {
      if (entries.length >= limit) {
         break;
      }

      const parts = line.split('|');
      if (parts.length < 3) {
         continue;
      }

      const hash = parts[0];
      const timestamp = parts[1];
      const message = parts[2];
      if (!hash || !timestamp || !message) {
         continue;
      }

      const parsed = parseCommitMessage(message);

      if (parsed) {
         // Apply filters
         if (opts.filterType && parsed.noteType !== opts.filterType) {
            continue;
         }

         if (opts.filterTag && !parsed.tags?.includes(opts.filterTag)) {
            continue;
         }

         if (opts.filterOperation && parsed.operation !== opts.filterOperation) {
            continue;
         }

         entries.push({
            hash,
            timestamp,
            message,
            type: 'commit',
            ...parsed,
         });
      } else if (message.startsWith('pk synthesize')) {
         // Git note (synthesize operation)
         if (opts.type === 'commits') {
            continue;
         }

         entries.push({
            hash,
            timestamp,
            message,
            type: 'note',
         });
      }
   }

   return entries;
}

/**
 * Parse a structured commit message.
 */
export function parseCommitMessage(message: string): ParsedCommit | undefined {
   // Parse: "knowledge: <operation> <type> <title>"
   const match = /^knowledge: (intake|update|delete) (note|decision|question|source) (.+)$/v.exec(message);
   if (!match || match.length < 4) {
      return undefined;
   }

   const operation = match[1];
   const noteType = match[2];
   const title = match[3];
   if (!operation || !noteType || !title) {
      return undefined;
   }

   return {
      operation,
      noteType,
      title,
      tags: [], // Could extract from file if needed
   };
}

/**
 * Extract title from a knowledge note file path.
 */
export function extractTitleFromPath(filePath: string): string {
   // Extract title from path like ~/.pk/myproject/notes/2026-05-08-my-title.md
   const basename = path.basename(filePath, '.md');
   const parts = basename.split('-');
   // Remove date prefix (YYYY-MM-DD)
   if (parts.length > 3) {
      return parts.slice(3).join('-');
   }

   return basename;
}

/**
 * Format history entries for display.
 */
export function formatHistory(entries: HistoryEntry[]): string {
   return entries
      .map(e => {
         const date = new Date(e.timestamp).toLocaleDateString();
         if (e.type === 'note') {
            return `${date} | ${e.hash.slice(0, 7)} | 📋 ${e.message}`;
         }

         return `${date} | ${e.hash.slice(0, 7)} | ${e.operation} ${e.noteType} | ${e.message.replace(/^knowledge: [^ ]+ [^ ]+ /v, '')}`;
      })
      .join('\n');
}
