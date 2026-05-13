import { existsSync } from 'node:fs';
import path from 'node:path';
import { Database } from 'bun:sqlite';
import { cosineSimilarity } from 'ai';
import { validNotes } from './notes.ts';
import type { EmbeddingProvider } from './embedding.ts';

const DB_NAME = '.index.db';

type Row = {
   id: string;
   path: string;
   score: number;
   snippet: string;
   status: string;
   tags: string;
   title: string;
   type: string;
};

function dbPath(knowledgeDir: string): string {
   return path.join(knowledgeDir, DB_NAME);
}

function openDb(knowledgeDir: string): Database {
   const db = new Database(dbPath(knowledgeDir));
   // WAL allows concurrent readers alongside a writer (important when multiple
   // MCP sessions share the same knowledge dir). busy_timeout retries for 5s
   // instead of failing immediately with SQLITE_BUSY.
   db.run('PRAGMA journal_mode = WAL');
   db.run('PRAGMA busy_timeout = 5000');
   db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id,
    path     UNINDEXED,
    type     UNINDEXED,
    status   UNINDEXED,
    title,
    tags,
    body,
    tokenize = 'porter unicode61'
  )`);
   db.run(`CREATE TABLE IF NOT EXISTS note_vectors (
    id   TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    vec  BLOB NOT NULL
  )`);
   return db;
}

function encodeVector(v: number[]): Uint8Array {
   const buf = new DataView(new ArrayBuffer(v.length * 4));
   for (const [i, val] of v.entries()) {
      buf.setFloat32(i * 4, val, true);
   }

   return new Uint8Array(buf.buffer);
}

function decodeVector(buf: Uint8Array): number[] {
   const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
   const len = buf.byteLength / 4;
   return Array.from({ length: len }, (_, i) => view.getFloat32(i * 4, true));
}

export async function rebuild(knowledgeDir: string, provider?: EmbeddingProvider): Promise<number> {
   const db = openDb(knowledgeDir);
   db.run('DELETE FROM notes_fts');
   const insert = db.prepare('INSERT INTO notes_fts(id,path,type,status,title,tags,body) VALUES(?,?,?,?,?,?,?)');
   const notes = await validNotes(knowledgeDir, ['index']);
   for (const n of notes) {
      insert.run(
         n.meta.id ?? '',
         n.path,
         n.meta.type ?? '',
         n.meta.status ?? '',
         n.meta.title ?? '',
         (n.meta.tags ?? []).join(' '),
         n.body,
      );
   }

   if (provider) {
      db.run('DELETE FROM note_vectors');
      const insertVec = db.prepare('INSERT INTO note_vectors(id,path,vec) VALUES(?,?,?)');
      const BATCH = 32;
      for (let i = 0; i < notes.length; i += BATCH) {
         const batch = notes.slice(i, i + BATCH);
         const texts = batch.map(n => `${n.meta.title ?? ''}\n${n.body}`);
         const vectors = await provider.embed(texts); // eslint-disable-line no-await-in-loop
         for (const [j, note] of batch.entries()) {
            const vec = vectors[j]!;
            insertVec.run(note.meta.id ?? '', note.path, encodeVector(vec));
         }
      }
   }

   db.close();
   return notes.length;
}

export type SearchResult = {
   id: string;
   path: string;
   score: number;
   snippet: string;
   status: string;
   tags: string[];
   title: string;
   type: string;
};

export function search(
   knowledgeDir: string,
   query: string,
   opts: { filterStatus?: string; filterTag?: string; filterType?: string; limit?: number } = {},
): SearchResult[] {
   const { filterStatus, filterTag, filterType, limit } = opts;

   if (!existsSync(dbPath(knowledgeDir))) {
      throw new Error('Search index not found — run: pk index');
   }

   const db = openDb(knowledgeDir);
   const args: string[] = [ftsQuery(query)];
   let sql = `SELECT path,id,type,status,title,tags,bm25(notes_fts) as score,
              snippet(notes_fts, 6, '**', '**', '...', 15) as snippet
             FROM notes_fts WHERE notes_fts MATCH ?`;

   if (filterType) {
      sql += ' AND type = ?';
      args.push(filterType);
   }

   if (filterStatus) {
      sql += ' AND status = ?';
      args.push(filterStatus);
   }

   sql += ' ORDER BY score';
   if (limit && limit > 0) {
      sql += ` LIMIT ${limit}`;
   }

   const rows = db.query<Row, string[]>(sql).all(...args);
   db.close();

   return rows
      .map(r => ({ ...r, tags: r.tags ? r.tags.split(' ') : [] }))
      .filter(r => !filterTag || r.tags.includes(filterTag));
}

export type SemanticResult = {
   id: string;
   path: string;
   score: number;
};

export async function semanticSearch(
   knowledgeDir: string,
   queryVector: number[],
   limit = 10,
): Promise<SemanticResult[]> {
   if (!existsSync(dbPath(knowledgeDir))) {
      throw new Error('Search index not found — run: pk index');
   }

   const db = openDb(knowledgeDir);
   const rows = db.query<{ id: string; path: string; vec: Uint8Array }, never[]>('SELECT id, path, vec FROM note_vectors').all();
   db.close();

   if (rows.length === 0) {
      return [];
   }

   return rows
      .map(r => ({ id: r.id, path: r.path, score: cosineSimilarity(queryVector, decodeVector(r.vec)) }))
      .toSorted((a, b) => b.score - a.score)
      .slice(0, limit);
}

type SearchFilters = { filterStatus?: string; filterTag?: string; filterType?: string };
type HybridOpts = { limit?: number } & SearchFilters;

export type SearchExecutionResult = { mode: 'keyword' | 'hybrid'; results: SearchResult[] };

export async function executeSearch(
   knowledgeDir: string,
   query: string,
   opts: { limit?: number; provider?: EmbeddingProvider } & SearchFilters = {},
): Promise<SearchExecutionResult> {
   const limit = opts.limit && opts.limit > 0 ? opts.limit : 10;

   if (opts.provider && hasVectors(knowledgeDir)) {
      const [queryVector] = await opts.provider.embed([query]);
      if (queryVector) {
         return {
            mode: 'hybrid',
            results: await hybridSearch(knowledgeDir, query, queryVector, {
               limit,
               filterStatus: opts.filterStatus,
               filterTag: opts.filterTag,
               filterType: opts.filterType,
            }),
         };
      }
   }

   return {
      mode: 'keyword',
      results: search(knowledgeDir, query, {
         filterStatus: opts.filterStatus,
         filterTag: opts.filterTag,
         filterType: opts.filterType,
         limit: opts.limit,
      }),
   };
}

export async function hybridSearch(
   knowledgeDir: string,
   query: string,
   queryVector: number[],
   opts: HybridOpts = {},
): Promise<SearchResult[]> {
   const POOL = 100;
   const K = 60;
   const limit = opts.limit ?? 10;

   const ftsResults = search(knowledgeDir, query, { ...opts, limit: POOL });
   const semResults = await semanticSearch(knowledgeDir, queryVector, POOL);

   const scores = new Map<string, number>();
   const meta = new Map<string, SearchResult>();

   for (const [rank, r] of ftsResults.entries()) {
      scores.set(r.id, (scores.get(r.id) ?? 0) + (1 / (K + rank + 1)));
      meta.set(r.id, r);
   }

   for (const [rank, r] of semResults.entries()) {
      scores.set(r.id, (scores.get(r.id) ?? 0) + (1 / (K + rank + 1)));
   }

   // Enrich semantic-only hits with metadata from FTS table
   const missing = semResults.map(r => r.id).filter(id => !meta.has(id));
   if (missing.length > 0) {
      const db = openDb(knowledgeDir);
      for (const id of missing) {
         const row = db.query<Row, [string]>('SELECT path,id,type,status,title,tags,0 as score,\'\' as snippet FROM notes_fts WHERE id = ?').get(id);
         if (row) {
            meta.set(id, { ...row, tags: row.tags ? row.tags.split(' ') : [] });
         }
      }

      db.close();
   }

   return [...scores.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, limit)
      .flatMap(([id]) => {
         const m = meta.get(id);
         return m ? [m] : [];
      });
}

export async function upsertVector(knowledgeDir: string, id: string, notePath: string, vec: number[]): Promise<void> {
   const db = openDb(knowledgeDir);
   db.run('INSERT OR REPLACE INTO note_vectors(id, path, vec) VALUES(?,?,?)', [id, notePath, encodeVector(vec)]);
   db.close();
}

export function hasVectors(knowledgeDir: string): boolean {
   if (!existsSync(dbPath(knowledgeDir))) {
      return false;
   }

   const db = openDb(knowledgeDir);
   const row = db.query<{ count: number }, never[]>('SELECT COUNT(*) as count FROM note_vectors').get();
   db.close();
   return (row?.count ?? 0) > 0;
}

export function vocab(knowledgeDir: string): Array<{ tag: string; count: number }> {
   if (!existsSync(dbPath(knowledgeDir))) {
      throw new Error('Search index not found — run: pk index');
   }

   const db = openDb(knowledgeDir);
   const rows = db.query<{ tags: string }, never[]>('SELECT tags FROM notes_fts WHERE tags != \'\'').all();
   db.close();

   const counts = new Map<string, number>();
   for (const row of rows) {
      for (const tag of row.tags.split(' ').filter(Boolean)) {
         counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
   }

   return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .toSorted((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function ftsQuery(q: string): string {
   const terms = q.trim().toLowerCase().split(/\s+/v).filter(Boolean);
   if (terms.length === 0) {
      return '"*"';
   }

   return terms.map(t => `"${t.replaceAll('"', '""')}"*`).join(' AND ');
}
