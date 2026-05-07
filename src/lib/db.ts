import {existsSync} from 'node:fs';
import path from 'node:path';
import {Database} from 'bun:sqlite';
import {validNotes} from './notes.ts';

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
	return db;
}

export function rebuild(knowledgeDir: string): number {
	const db = openDb(knowledgeDir);
	db.run('DELETE FROM notes_fts');
	const insert = db.prepare('INSERT INTO notes_fts(id,path,type,status,title,tags,body) VALUES(?,?,?,?,?,?,?)');
	const notes = validNotes(knowledgeDir, ['index']);
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

	db.close();
	return notes.length;
}

type SearchResult = {
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
	opts: {filterStatus?: string; filterTag?: string; filterType?: string; limit?: number} = {},
): SearchResult[] {
	const {filterStatus, filterTag, filterType, limit} = opts;

	if (!existsSync(dbPath(knowledgeDir))) {
		throw new Error('Search index not found — run: pk rebuild');
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
		.map(r => ({...r, tags: r.tags ? r.tags.split(' ') : []}))
		.filter(r => !filterTag || r.tags.includes(filterTag));
}

export function vocab(knowledgeDir: string): Array<{tag: string; count: number}> {
	if (!existsSync(dbPath(knowledgeDir))) {
		throw new Error('Search index not found — run: pk rebuild');
	}

	const db = openDb(knowledgeDir);
	const rows = db.query<{tags: string}, never[]>('SELECT tags FROM notes_fts WHERE tags != \'\'').all();
	db.close();

	const counts = new Map<string, number>();
	for (const row of rows) {
		for (const tag of row.tags.split(' ').filter(Boolean)) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}

	return [...counts.entries()]
		.map(([tag, count]) => ({tag, count}))
		.toSorted((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function ftsQuery(q: string): string {
	const terms = q.trim().toLowerCase().split(/\s+/v).filter(Boolean);
	if (terms.length === 0) {
		return '"*"';
	}

	return terms.map(t => `"${t.replaceAll('"', '""')}"*`).join(' AND ');
}
