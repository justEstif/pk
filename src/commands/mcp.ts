/**
 * pk mcp — stdio MCP server for Claude Desktop and Codex Desktop.
 *
 * MCP is transport only. Every tool is a direct projection of an existing CLI
 * command onto the MCP protocol. No business logic lives here; all work is
 * delegated to lib functions shared with the CLI.
 *
 * IMPORTANT: process.stdout is the MCP protocol pipe. All diagnostic output
 * MUST go to stderr (console.error / console.warn). Never console.log from
 * this file or any lib function called from tool handlers.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { Command } from 'commander';
import { executeSearch } from '../lib/db.ts';
import { lintNotes } from '../lib/lint.ts';
import { getHistory } from '../lib/git.ts';
import { selectNotes, formatSynthesizeOutput } from '../lib/synthesize.ts';
import { requireKnowledgeDir } from '../lib/paths.ts';
import { createKnowledgeNote, updateKnowledgeNote, deleteKnowledgeNote } from '../lib/operations.ts';
import { vocab } from '../lib/db.ts';
import { loadConfig } from '../lib/config.ts';
import { getProvider } from '../lib/embedding.ts';
import { logOp } from '../lib/log.ts';
import pkg from '../../package.json';

// ─── MCP tool runner ─────────────────────────────────────────────────────────

/**
 * Resolves the knowledge dir, runs fn, and emits one wide-event log line.
 * Any error is re-thrown so the MCP framework returns an isError response.
 */
async function runMcpTool<T>(
   op: string,
   params: Record<string, unknown>,
   fn: (dir: string) => Promise<T>,
): Promise<T> {
   const dir = requireKnowledgeDir();
   const start = Date.now();
   try {
      const result = await fn(dir);
      logOp('mcp', op, dir, start, undefined, params);
      return result;
   } catch (error) {
      logOp('mcp', op, dir, start, error, params);
      throw error;
   }
}

// ─── Domain guidance embedded in tool descriptions ────────────────────────────
// Desktop harnesses do not install the pk skill file, so the agent receives
// domain guidance through these descriptions instead.

const TYPE_GUIDE = `\
Types: note (Summary/Details/Evidence/Related), decision (Decision/Context/Rationale/Consequences/Related), question (Question/Why It Matters/Current Understanding/Resolution), source (Source/Raw Material/Extracted Items). Tags: lowercase slugs e.g. "auth,api". Run pk_lint after pk_write.`;

// ─── Server factory ───────────────────────────────────────────────────────────

function createPkMcpServer(): McpServer {
   const server = new McpServer({
      name: 'pk',
      version: pkg.version,
   });

   // ── pk_search ──────────────────────────────────────────────────────────────
   server.tool(
      'pk_search',
      'Search project knowledge notes. Returns path, type, status, title, tags, snippet per match.',
      {
         query: z.string().describe('Search query'),
         type: z.string().optional().describe('Filter by note type: note, decision, question, source'),
         status: z.string().optional().describe('Filter by note status'),
         tag: z.string().optional().describe('Filter by tag slug'),
         limit: z.number().int().positive().default(10).describe('Maximum results'),
      },
      async ({ query, type, status, tag, limit }) =>
         runMcpTool('pk_search', { query, type, status, tag, limit }, async dir => {
            const config = await loadConfig();
            const provider = getProvider(config.embedding);
            const { results } = await executeSearch(dir, query, {
               filterStatus: status,
               filterTag: tag,
               filterType: type,
               limit,
               provider,
            });
            return { content: [{ type: 'text', text: JSON.stringify(results) }] };
         }),
   );

   // ── pk_synthesize ──────────────────────────────────────────────────────────
   server.tool(
      'pk_synthesize',
      'Produce a ranked context summary. Use sessionStart=true at conversation start — returns open questions, accepted decisions, active notes.',
      {
         query: z.string().optional().describe('Search query (required unless sessionStart or all is set)'),
         sessionStart: z.boolean().optional().describe('Return open questions + accepted decisions + active notes'),
         all: z.boolean().optional().describe('Include all notes'),
         type: z.string().optional().describe('Filter by note type'),
         tag: z.string().optional().describe('Filter by tag'),
         limit: z.number().int().positive().default(20).describe('Maximum notes to include'),
      },
      async ({ query, sessionStart, all, type, tag, limit }) =>
         runMcpTool('pk_synthesize', { query, sessionStart, all, limit }, async dir => {
            const notes = await selectNotes(dir, query, { all, limit, sessionStart, tag, type });
            if (notes.length === 0) {
               return { content: [{ type: 'text', text: 'No matching notes.' }] };
            }

            const label = sessionStart ? 'session context' : (query ?? 'all');
            return { content: [{ type: 'text', text: formatSynthesizeOutput(notes, label) }] };
         }),
   );

   // ── pk_new ─────────────────────────────────────────────────────────────────
   server.tool(
      'pk_new',
      `Create a new knowledge note. Always pk_search before creating to avoid duplicates. Returns absolute path.\n\n${TYPE_GUIDE}`,
      {
         type: z.enum(['note', 'decision', 'question', 'source']).describe('Note type'),
         title: z.string().describe('Note title'),
         tags: z.string().optional().default('').describe('Comma-separated tag slugs'),
      },
      async ({ type, title, tags }) =>
         runMcpTool('pk_new', { type, title, tags }, async dir => {
            const notePath = await createKnowledgeNote(dir, type, title, tags ?? '');
            return { content: [{ type: 'text', text: JSON.stringify({ path: notePath }) }] };
         }),
   );

   // ── pk_read ────────────────────────────────────────────────────────────────
   server.tool(
      'pk_read',
      'Read the full contents of a knowledge note, including frontmatter. Use paths returned by pk_search or pk_synthesize.',
      {
         path: z.string().describe('Absolute path to the note file'),
      },
      async ({ path: notePath }) =>
         runMcpTool('pk_read', { path: notePath }, async _dir => {
            const file = Bun.file(notePath);
            if (!await file.exists()) {
               throw new Error(`Note not found: ${notePath}`);
            }

            const content = await file.text();
            return { content: [{ type: 'text', text: JSON.stringify({ path: notePath, content }) }] };
         }),
   );

   // ── pk_write ───────────────────────────────────────────────────────────────
   server.tool(
      'pk_write',
      'Write content to an existing note and commit. Always pk_read first; never change frontmatter id, type, or created. Run pk_lint after.',
      {
         path: z.string().describe('Absolute path to the note file'),
         content: z.string().describe('Complete new file content including frontmatter'),
      },
      async ({ path: notePath, content }) =>
         runMcpTool('pk_write', { path: notePath }, async dir => {
            await updateKnowledgeNote(dir, notePath, content);
            return { content: [{ type: 'text', text: JSON.stringify({ path: notePath }) }] };
         }),
   );

   // ── pk_delete ──────────────────────────────────────────────────────────────
   server.tool(
      'pk_delete',
      'Delete a knowledge note and commit the deletion. Non-interactive — no confirmation prompt. The note is recoverable from git history.',
      {
         path: z.string().describe('Absolute path to the note file'),
      },
      async ({ path: notePath }) =>
         runMcpTool('pk_delete', { path: notePath }, async dir => {
            const fullPath = await deleteKnowledgeNote(dir, notePath);
            return { content: [{ type: 'text', text: JSON.stringify({ path: fullPath, status: 'deleted' }) }] };
         }),
   );

   // ── pk_vocab ───────────────────────────────────────────────────────────────
   server.tool(
      'pk_vocab',
      'List all tags in the knowledge base ranked by frequency. Useful for orienting before searching.',
      {},
      async () =>
         runMcpTool('pk_vocab', {}, async dir => {
            const tags = vocab(dir);
            return { content: [{ type: 'text', text: JSON.stringify({ tags }) }] };
         }),
   );

   // ── pk_lint ────────────────────────────────────────────────────────────────
   server.tool(
      'pk_lint',
      'Validate knowledge notes for structural correctness. Run after pk_write. Returns errors (blocking) and warnings (advisory).',
      {
         paths: z.array(z.string()).optional().describe('Specific note paths to lint. Omit to lint all notes.'),
      },
      async ({ paths }) =>
         runMcpTool('pk_lint', { paths: paths?.length ?? 'all' }, async dir => {
            const { issues, noteCount } = await lintNotes(dir, paths);
            return { content: [{ type: 'text', text: JSON.stringify({ issues, noteCount }) }] };
         }),
   );

   // ── pk_history ─────────────────────────────────────────────────────────────
   server.tool(
      'pk_history',
      'View knowledge operation history — creates, updates, deletes, and session events.',
      {
         limit: z.number().int().positive().default(20).describe('Number of entries to return'),
         type: z.enum(['commits', 'notes', 'all']).optional().default('all').describe('Filter by entry type'),
         filterType: z.enum(['note', 'decision', 'question', 'source']).optional().describe('Filter by note type'),
         filterTag: z.string().optional().describe('Filter by tag'),
         filterOperation: z.enum(['create', 'update', 'delete']).optional().describe('Filter by operation'),
      },
      async ({ limit, type, filterType, filterTag, filterOperation }) =>
         runMcpTool('pk_history', { limit, type, filterType }, async dir => {
            const entries = await getHistory(dir, {
               filterOperation,
               filterTag,
               filterType,
               limit,
               type,
            });
            return { content: [{ type: 'text', text: JSON.stringify({ entries }) }] };
         }),
   );

   // ── pk-session-context prompt ──────────────────────────────────────────────
   // Exposed as an MCP prompt (not a tool) so clients can request it as a
   // conversation starter. Returns the same session-start context as
   // pk_synthesize(sessionStart=true) but formatted as a prompt message.
   server.prompt(
      'pk-session-context',
      'Load session context: open questions, accepted decisions, and active notes. Use at the start of a conversation to orient yourself.',
      async () => {
         const dir = requireKnowledgeDir();
         const notes = await selectNotes(dir, undefined, { limit: 20, sessionStart: true });
         const text = notes.length === 0
            ? 'No active knowledge notes found. Use pk_new to start capturing knowledge.'
            : formatSynthesizeOutput(notes, 'session context');
         return {
            messages: [{ role: 'user', content: { type: 'text', text } }],
         };
      },
   );

   return server;
}

// ─── Command registration ─────────────────────────────────────────────────────

export function registerMcp(program: Command): void {
   program
      .command('mcp')
      .description('Start the pk MCP server (stdio transport) — used by Claude Desktop and Codex Desktop')
      .action(async () => {
         const server = createPkMcpServer();
         const transport = new StdioServerTransport();
         await server.connect(transport);
      });
}
