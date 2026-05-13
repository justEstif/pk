import {
   existsSync, readFileSync, readdirSync, statSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Returns the ~/.pk home directory for all pk knowledge bases. */
export function pkHome(): string {
   return path.join(process.env.HOME ?? os.homedir(), '.pk');
}

/** Returns the directory for a named global project: ~/.pk/<name> */
export function projectDir(name: string): string {
   return path.join(pkHome(), name);
}

export type PkProjectConfig = {
   knowledgeDir: string;
   mode: 'local' | 'global';
};

/**
 * Legacy flat config written by pk < 0.6.
 * Only `knowledgeDir` matters — `mode` is inferred as global.
 */
type LegacyPkConfig = {
   knowledgeDir?: string;
};

/**
 * Walk up from startDir looking for .pk/config.json.
 * Returns the parsed config and the directory it was found in, or null if not found.
 */
export function findPkProjectConfig(startDir: string): { config: PkProjectConfig; configDir: string } | null {
   let dir = startDir;
   while (true) {
      const candidate = path.join(dir, '.pk', 'config.json');
      if (existsSync(candidate)) {
         try {
            const config = JSON.parse(readFileSync(candidate, 'utf8')) as PkProjectConfig;
            return { config, configDir: dir };
         } catch {
            // Malformed config — stop here rather than silently walk further up
            return null;
         }
      }

      // Legacy format: .pk.json in project root (pk < 0.6)
      const legacy = path.join(dir, '.pk.json');
      if (existsSync(legacy)) {
         try {
            const raw = JSON.parse(readFileSync(legacy, 'utf8')) as LegacyPkConfig;
            if (raw.knowledgeDir) {
               return { config: { knowledgeDir: raw.knowledgeDir, mode: 'global' }, configDir: dir };
            }
         } catch {
            return null;
         }
      }

      const parent = path.dirname(dir);
      if (parent === dir) {
         return null;
      } // Reached filesystem root

      dir = parent;
   }
}

/**
 * Returns the knowledge directory for the current project.
 * Precedence: PK_KNOWLEDGE_DIR env var > .pk/config.json found by walking up from CWD.
 */
export function requireKnowledgeDir(): string {
   if (process.env.PK_KNOWLEDGE_DIR) {
      return process.env.PK_KNOWLEDGE_DIR;
   }

   const found = findPkProjectConfig(process.cwd());
   if (found) {
      // Local mode: knowledge dir is always <configDir>/.pk — relocatable
      if (found.config.mode === 'local') {
         return path.join(found.configDir, '.pk');
      }

      if (found.config.knowledgeDir) {
         return found.config.knowledgeDir;
      }
   }

   throw new Error('No .pk/config.json found. Either run: pk init --harness <harness>, or prefix the command with: PK_KNOWLEDGE_DIR=<path> pk <command>');
}

/** Returns sorted list of existing global project names under ~/.pk/ */
export function listExistingProjects(): string[] {
   const home = pkHome();
   if (!existsSync(home)) {
      return [];
   }

   return readdirSync(home)
      .filter(entry => statSync(path.join(home, entry)).isDirectory())
      .toSorted();
}
