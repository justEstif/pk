import { existsSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test';
import { initRepo } from './git.ts';
import { createKnowledgeNote, updateKnowledgeNote, deleteKnowledgeNote } from './operations.ts';

setDefaultTimeout(30_000);

// One shared tmp root per file — git repo created once in beforeAll.
// Each test gets a unique subdir to avoid cross-test state.
const ROOT = path.join(os.tmpdir(), `pk-ops-test-${Date.now()}`);
const KNOWLEDGE_DIR = path.join(ROOT, 'knowledge');

let origHome: string | undefined;
let counter = 0;

// Unique knowledge dir per test — fresh subdir under KNOWLEDGE_DIR.
function freshDir(): string {
   const dir = path.join(KNOWLEDGE_DIR, `run-${counter++}`);
   for (const sub of ['notes', 'decisions', 'questions', 'sources', 'indexes']) {
      mkdirSync(path.join(dir, sub), { recursive: true });
   }

   return dir;
}

beforeAll(async () => {
   // Redirect HOME so loadConfig() reads a clean config with no embedding,
   // preventing tryEmbedNote from trying to connect to Ollama.
   origHome = process.env.HOME;
   const fakeHome = path.join(ROOT, 'home');
   mkdirSync(fakeHome, { recursive: true });
   process.env.HOME = fakeHome;

   // Create the parent dirs and init a shared git repo.
   mkdirSync(KNOWLEDGE_DIR, { recursive: true });
   await Bun.write(path.join(KNOWLEDGE_DIR, '.gitignore'), '*.db\n*.db-shm\n*.db-wal\n');
   await initRepo(KNOWLEDGE_DIR);
});

afterAll(() => {
   rmSync(ROOT, { recursive: true, force: true });
   if (origHome === undefined) {
      delete process.env.HOME;
   } else {
      process.env.HOME = origHome;
   }
});

// Silence "No .pk/config.json found" warnings that appear when tests run
// without a project context — they're expected here.
let dir: string;
beforeEach(() => {
   dir = freshDir();
});

describe('createKnowledgeNote', () => {
   test('creates a note file and returns its path', async () => {
      const notePath = await createKnowledgeNote(dir, 'note', 'Test Note', 'auth,api');
      expect(notePath).toContain('/notes/');
      expect(notePath).toEndWith('.md');
      expect(existsSync(notePath)).toBe(true);
   });

   test('created file contains expected frontmatter fields', async () => {
      const notePath = await createKnowledgeNote(dir, 'note', 'My Note', '');
      const content = await Bun.file(notePath).text();
      expect(content).toContain('type: note');
      expect(content).toContain('title: My Note');
   });

   test('rejects unknown type', async () => {
      await expect(createKnowledgeNote(dir, 'bogus', 'title', '')).rejects.toThrow('Unknown type');
   });

   test('rejects duplicate (same title same day)', async () => {
      await createKnowledgeNote(dir, 'note', 'Same Title', '');
      await expect(createKnowledgeNote(dir, 'note', 'Same Title', '')).rejects.toThrow('Already exists');
   });
});

describe('updateKnowledgeNote', () => {
   test('writes new content and the change is persisted', async () => {
      const notePath = await createKnowledgeNote(dir, 'note', 'Update Me', '');
      const original = await Bun.file(notePath).text();
      const updated = original.replace('## Summary', '## Summary\n\nUpdated content.');
      await updateKnowledgeNote(dir, notePath, updated);
      const result = await Bun.file(notePath).text();
      expect(result).toContain('Updated content.');
   });

   test('rejects path outside knowledge directory', async () => {
      const outside = path.join(ROOT, 'outside.md');
      await Bun.write(outside, '# outside');
      await expect(updateKnowledgeNote(dir, outside, 'new')).rejects.toThrow('within knowledge directory');
   });

   test('rejects missing file', async () => {
      await expect(updateKnowledgeNote(dir, path.join(dir, 'notes', 'ghost.md'), 'x')).rejects.toThrow('Note not found');
   });
});

describe('deleteKnowledgeNote', () => {
   test('removes the file and returns its path', async () => {
      const notePath = await createKnowledgeNote(dir, 'note', 'Delete Me', '');
      expect(existsSync(notePath)).toBe(true);
      const returned = await deleteKnowledgeNote(dir, notePath);
      expect(returned).toBe(notePath);
      expect(existsSync(notePath)).toBe(false);
   });

   test('rejects missing file', async () => {
      await expect(deleteKnowledgeNote(dir, path.join(dir, 'notes', 'ghost.md'))).rejects.toThrow('Note not found');
   });

   test('resolves relative path against knowledge directory', async () => {
      const notePath = await createKnowledgeNote(dir, 'note', 'Relative', '');
      const rel = path.relative(dir, notePath);
      const returned = await deleteKnowledgeNote(dir, rel);
      expect(returned).toBe(notePath);
      expect(existsSync(notePath)).toBe(false);
   });
});
