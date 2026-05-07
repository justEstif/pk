import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import type {Command} from 'commander';
import {search} from '../lib/db.ts';
import {lintNotes} from '../lib/lint.ts';
import {createNote, validNotes} from '../lib/notes.ts';
import {selectNotes, formatSynthesizeOutput} from '../lib/synthesize.ts';
import {requireKnowledgeDir} from '../lib/paths.ts';

export function createPkMcpServer(): McpServer {
	const server = new McpServer({
		name: 'pk',
		version: '0.1.0',
	});

	// Tool: pk_search
	server.registerTool(
		'pk_search',
		{
			description: 'Search project knowledge notes using full-text search (BM25). Returns matching notes with path, type, status, title, tags, and snippet.',
			inputSchema: {
				query: z.string().describe('Search query'),
				type: z.string().optional().describe('Filter by note type (note, decision, question, source)'),
				status: z.string().optional().describe('Filter by note status'),
				tag: z.string().optional().describe('Filter by tag'),
				limit: z.number().int().positive().default(10).describe('Maximum results to return'),
			},
		},
		async ({query, type, status, tag, limit}) => {
			const dir = requireKnowledgeDir();
			const results = search(dir, query, {
				filterStatus: status,
				filterTag: tag,
				filterType: type,
				limit,
			});
			return {
				content: [{type: 'text', text: JSON.stringify(results, null, 2)}],
			};
		},
	);

	// Tool: pk_synthesize
	server.registerTool(
		'pk_synthesize',
		{
			description: 'Produce a ranked context dump of matching notes. Use --session-start for open questions + accepted decisions + active notes.',
			inputSchema: {
				query: z.string().optional().describe('Search query (required unless all or sessionStart is set)'),
				all: z.boolean().optional().describe('Include all notes'),
				sessionStart: z.boolean().optional().describe('Return open questions + accepted decisions + active notes'),
				type: z.string().optional().describe('Filter by note type'),
				tag: z.string().optional().describe('Filter by tag'),
				limit: z.number().int().positive().default(10).describe('Maximum notes to include'),
			},
		},
		async ({query, all, sessionStart, type, tag, limit}) => {
			const dir = requireKnowledgeDir();
			const notes = await selectNotes(dir, query, {
				all,
				limit,
				sessionStart,
				tag,
				type,
			});
			if (notes.length === 0) {
				return {content: [{type: 'text', text: 'No matching notes.'}]};
			}

			const label = sessionStart ? 'session context' : (query ?? 'all');
			const text = formatSynthesizeOutput(notes, label);
			return {content: [{type: 'text', text}]};
		},
	);

	// Tool: pk_new
	server.registerTool(
		'pk_new',
		{
			description: 'Create a new knowledge note of the given type. Returns the path to the created file.',
			inputSchema: {
				type: z.enum(['note', 'decision', 'question', 'source']).describe('Note type'),
				title: z.string().describe('Note title'),
				tags: z.string().optional().default('').describe('Comma-separated tags'),
			},
		},
		async ({type, title, tags}) => {
			const dir = requireKnowledgeDir();
			try {
				const outPath = await createNote(dir, type, title, tags ?? '');
				return {content: [{type: 'text', text: outPath}]};
			} catch (error) {
				return {
					content: [{type: 'text', text: String(error)}],
					isError: true,
				};
			}
		},
	);

	// Tool: pk_lint
	server.registerTool(
		'pk_lint',
		{
			description: 'Validate knowledge note structure and frontmatter. Returns lint issues grouped by severity.',
			inputSchema: {},
		},
		async () => {
			const dir = requireKnowledgeDir();
			const {issues, noteCount} = await lintNotes(dir);
			const errors = issues.filter(i => i.level === 'error');
			const warnings = issues.filter(i => i.level === 'warn');
			const lines: string[] = [
				`Linted ${noteCount} files — ${errors.length} errors, ${warnings.length} warnings`,
			];
			for (const {level, path: p, message} of issues) {
				lines.push(`${level.toUpperCase()} ${p}: ${message}`);
			}

			const hasErrors = errors.length > 0;
			return {
				content: [{type: 'text', text: lines.join('\n')}],
				isError: hasErrors,
			};
		},
	);

	return server;
}

export function registerMcp(program: Command): void {
	program
		.command('mcp')
		.description('Start the pk MCP server (stdio transport). PK_KNOWLEDGE_DIR must be set.')
		.action(async () => {
			const server = createPkMcpServer();
			const transport = new StdioServerTransport();
			await server.connect(transport);
		});
}
