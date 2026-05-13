import { requireKnowledgeDir } from './paths.ts';
import { logOp } from './log.ts';
import type { Issue } from './lint.ts';
import type { HistoryEntry } from './git.ts';

/** Write data as JSON to stdout. */
export function writeJson(data: unknown): void {
   process.stdout.write(JSON.stringify(data) + '\n');
}

/**
 * Wrap a Commander action that needs the knowledge directory.
 * Resolves the directory, catches errors, exits with code 1 on failure,
 * and emits a wide-event log line on completion.
 *
 * @param op  Command name used as the log event's `op` field (e.g. 'search')
 * @param fn  Action callback receiving (knowledgeDir, ...commanderArgs)
 */
export function runDir<TArgs extends unknown[]>(
   op: string,
   fn: (dir: string, ...args: TArgs) => Promise<void> | void,
): (...args: TArgs) => Promise<void> {
   return async (...args: TArgs) => {
      const start = Date.now();
      let dir: string;
      try {
         dir = requireKnowledgeDir();
      } catch (error) {
         console.error(String(error));
         process.exit(1);
      }

      try {
         await fn(dir, ...args);
         logOp('cli', op, dir, start);
      } catch (error) {
         logOp('cli', op, dir, start, error);
         console.error(String(error));
         process.exit(1);
      }
   };
}

// JSON output types for CLI --json
export type JsonNewOutput = {
   path: string;
};

export type JsonLintOutput = {
   issues: Issue[];
   noteCount: number;
};

export type JsonSearchResult = {
   id: string;
   path: string;
   score: number;
   snippet: string;
   status: string;
   tags: string[];
   title: string;
   type: string;
};

export type JsonSearchOutput = {
   results: JsonSearchResult[];
};

export type JsonSynthesizedNote = {
   path: string;
   type: string;
   status: string;
   title: string;
   tags: string[];
   excerpt: string;
};

export type JsonSynthesizeOutput = {
   label: string;
   notes: JsonSynthesizedNote[];
};

export type JsonHistoryOutput = {
   entries: HistoryEntry[];
};

export type JsonDeleteOutput = {
   path: string;
   status: 'deleted';
};

export type JsonVocabOutput = {
   tags: Array<{ tag: string; count: number }>;
};

export type JsonReadOutput = {
   path: string;
   content: string;
};
