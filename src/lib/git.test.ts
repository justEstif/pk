import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { parseCommitMessage, extractTitleFromPath, formatHistory } from './git.ts';
import type { HistoryEntry } from './git.ts';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

describe('parseCommitMessage', () => {
   test('parses valid create commit', () => {
      const result = parseCommitMessage('knowledge: intake note my-title');
      expect(result?.operation).toBe('intake');
      expect(result?.noteType).toBe('note');
      expect(result?.title).toBe('my-title');
   });

   test('parses valid update commit', () => {
      const result = parseCommitMessage('knowledge: update decision authentication-flow');
      expect(result?.operation).toBe('update');
      expect(result?.noteType).toBe('decision');
      expect(result?.title).toBe('authentication-flow');
   });

   test('parses valid delete commit', () => {
      const result = parseCommitMessage('knowledge: delete question api-timeout');
      expect(result?.operation).toBe('delete');
      expect(result?.noteType).toBe('question');
      expect(result?.title).toBe('api-timeout');
   });

   test('returns undefined for invalid format', () => {
      expect(parseCommitMessage('fix: bug')).toBeUndefined();
      expect(parseCommitMessage('knowledge: invalid')).toBeUndefined();
      expect(parseCommitMessage('random message')).toBeUndefined();
   });
});

describe('extractTitleFromPath', () => {
   test('extracts title from note path with date prefix', () => {
      const title = extractTitleFromPath('/home/user/.pk/project/notes/2026-05-08-my-title.md');
      expect(title).toBe('my-title');
   });

   test('extracts multi-word title', () => {
      const title = extractTitleFromPath('/home/user/.pk/project/notes/2026-05-08-my-great-title.md');
      expect(title).toBe('my-great-title');
   });

   test('handles path without date prefix', () => {
      const title = extractTitleFromPath('/home/user/.pk/project/notes/simple-title.md');
      expect(title).toBe('simple-title');
   });

   test('handles path with insufficient parts', () => {
      const title = extractTitleFromPath('/home/user/.pk/project/notes/2026-05-08.md');
      expect(title).toBe('2026-05-08');
   });
});

describe('formatHistory', () => {
   test('formats commit entries', () => {
      const entries: HistoryEntry[] = [
         {
            hash: 'abc123',
            timestamp: '2026-05-08T12:00:00',
            message: 'knowledge: intake note test',
            type: 'commit',
            operation: 'intake',
            noteType: 'note',
            title: 'test',
         },
      ];

      const result = formatHistory(entries);
      expect(result).toContain('abc123');
      expect(result).toContain('intake note');
      expect(result).toContain('test');
   });

   test('formats note entries', () => {
      const entries: HistoryEntry[] = [
         {
            hash: 'def456',
            timestamp: '2026-05-08T12:00:00',
            message: 'pk synthesize\nQuery: test',
            type: 'note',
         },
      ];

      const result = formatHistory(entries);
      expect(result).toContain('def456');
      expect(result).toContain('📋');
      expect(result).toContain('pk synthesize');
   });

   test('formats mixed entries', () => {
      const entries: HistoryEntry[] = [
         {
            hash: 'abc123',
            timestamp: '2026-05-08T12:00:00',
            message: 'knowledge: intake note test',
            type: 'commit',
            operation: 'intake',
            noteType: 'note',
            title: 'test',
         },
         {
            hash: 'def456',
            timestamp: '2026-05-08T12:01:00',
            message: 'pk synthesize\nQuery: test',
            type: 'note',
         },
      ];

      const result = formatHistory(entries);
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('intake note');
      expect(lines[1]).toContain('📋');
   });
});
