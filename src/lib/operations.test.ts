import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createKnowledgeNote, updateKnowledgeNote, deleteKnowledgeNote } from './operations.ts';
import { loadConfig, saveConfig } from './config.ts';

describe('createKnowledgeNote', () => {
   let knowledgeDir: string;
   let originalConfig: Awaited<ReturnType<typeof loadConfig>>;

   beforeEach(async () => {
      // Create temp knowledge directory
      knowledgeDir = path.join(tmpdir(), `pk-test-${Date.now()}`);
      mkdirSync(knowledgeDir, { recursive: true });

      // Save original config
      originalConfig = await loadConfig();

      // Disable auto_commit for tests
      await saveConfig({ ...originalConfig, auto_commit: false });
   });

   afterEach(async () => {
      // Restore original config
      await saveConfig(originalConfig);

      // Cleanup temp directory
      rmSync(knowledgeDir, { recursive: true, force: true });
   });

   test('creates a note without git commit when auto_commit is false', async () => {
      const filePath = await createKnowledgeNote(knowledgeDir, 'note', 'test-note', 'test');

      expect(filePath).toBeTruthy();
      expect(filePath).toContain('notes/');
      expect(filePath).toContain('test-note');

      // Verify file exists
      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain('test-note');
      expect(content).toContain('## Summary');
   });
});
