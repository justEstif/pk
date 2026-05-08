import { expect, test, beforeAll, afterAll, describe } from 'bun:test';
import { pkJson } from '../src/run.ts';
import path from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';

// Use the built pk binary from the parent package
const PK_BIN = path.resolve(import.meta.dir, '..', '..', '..', 'dist', 'index.js');

let knowledgeDir: string;
let tmpDir: string;
let origKnowledgeDir: string | undefined;

beforeAll(() => {
   // Point to the built pk binary
   process.env.PK_COMMAND = PK_BIN;

   // Create temp knowledge directory
   tmpDir = path.join(os.tmpdir(), `pk-mcp-test-${Date.now()}`);
   knowledgeDir = path.join(tmpDir, 'kb');
   for (const dir of ['notes', 'decisions', 'questions', 'sources', 'indexes']) {
      mkdirSync(path.join(knowledgeDir, dir), { recursive: true });
   }

   writeFileSync(path.join(knowledgeDir, '.gitignore'), '.index.db\n');

   // Init git repo (required for new/delete/history commands)
   const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@test.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@test.com',
   };
   execSync(`git init ${knowledgeDir}`, { stdio: 'pipe' });
   execSync(`git -C ${knowledgeDir} add -A`, { stdio: 'pipe' });
   execSync(`git -C ${knowledgeDir} commit -m "init"`, { env: gitEnv, stdio: 'pipe' });

   // Build search index (required for vocab/search)
   process.env.PK_KNOWLEDGE_DIR = knowledgeDir;
   origKnowledgeDir = process.env.PK_KNOWLEDGE_DIR;
   execSync(`${PK_BIN} index`, { env: { ...process.env, PK_KNOWLEDGE_DIR: knowledgeDir }, stdio: 'pipe' });
});

afterAll(() => {
   rmSync(tmpDir, { recursive: true, force: true });
   if (origKnowledgeDir === undefined) {
      delete process.env.PK_KNOWLEDGE_DIR;
   } else {
      process.env.PK_KNOWLEDGE_DIR = origKnowledgeDir;
   }
});

describe('pkJson — shell-out adapter', () => {
   test('pk vocab returns tags array', async () => {
      const result = await pkJson(['vocab', '--json']);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0]!.text);
      expect(Array.isArray(data.tags)).toBe(true);
   });

   test('pk search returns results array', async () => {
      const result = await pkJson(['search', 'test', '--json']);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0]!.text);
      expect(Array.isArray(data.results)).toBe(true);
   });

   test('pk new creates a note and returns path', async () => {
      const result = await pkJson(['new', 'note', 'Test note', '--json', '--tags', 'test']);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0]!.text);
      expect(data.path).toContain(knowledgeDir);
      expect(data.path).toMatch(/notes.*\.md$/);
   });

   test('pk read returns note content', async () => {
      // Create a note first
      const createResult = await pkJson(['new', 'note', 'Read test', '--json']);
      const { path: notePath } = JSON.parse(createResult.content[0]!.text);

      const result = await pkJson(['read', notePath, '--json']);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0]!.text);
      expect(data.path).toBe(notePath);
      expect(data.content).toContain('Read test');
   });

   test('pk lint returns issues array', async () => {
      const result = await pkJson(['lint', '--json']);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0]!.text);
      expect(data).toHaveProperty('issues');
      expect(data).toHaveProperty('noteCount');
      expect(Array.isArray(data.issues)).toBe(true);
   });

   test('returns error for nonexistent path', async () => {
      const result = await pkJson(['read', '/nonexistent/path.md', '--json']);
      expect(result.isError).toBe(true);
   });
});
