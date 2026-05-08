import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {pkJson} from './run.ts';

const server = new McpServer({name: 'pk-mcp', version: '0.1.0'});

// ─── pk_search ────────────────────────────────────────────────────────────────

server.registerTool(
	'pk_search',
	{
		description: 'Search project knowledge notes using full-text search (BM25). Returns matching notes with path, type, status, title, tags, and snippet.',
		inputSchema: {
			query: z.string().describe('Search query'),
			type: z.string().optional().describe('Filter by note type (note, decision, question, source)'),
			status: z.string().optional().describe('Filter by note status'),
			tag: z.string().optional().describe('Filter by tag'),
			limit: z.number().int().positive().default(10).describe('Max results'),
		},
	},
	async ({query, type, status, tag, limit}) => {
		const args = ['search', query, '--json'];
		if (type) args.push('--type', type);
		if (status) args.push('--status', status);
		if (tag) args.push('--tag', tag);
		if (limit) args.push('--limit', String(limit));
		return pkJson(args);
	},
);

// ─── pk_synthesize ────────────────────────────────────────────────────────────

server.registerTool(
	'pk_synthesize',
	{
		description: 'Produce a ranked context dump of matching notes. Use sessionStart for open questions + accepted decisions + active notes.',
		inputSchema: {
			query: z.string().optional().describe('Search query (optional)'),
			all: z.boolean().optional().describe('Include all notes'),
			sessionStart: z.boolean().optional().describe('Session start mode'),
			type: z.string().optional().describe('Filter by note type'),
			tag: z.string().optional().describe('Filter by tag'),
			limit: z.number().int().positive().default(10).describe('Max notes'),
		},
	},
	async ({query, all, sessionStart, type, tag, limit}) => {
		const args = ['synthesize'];
		if (query) args.push(query);
		args.push('--json');
		if (all) args.push('--all');
		if (sessionStart) args.push('--session-start');
		if (type) args.push('--type', type);
		if (tag) args.push('--tag', tag);
		if (limit) args.push('--limit', String(limit));
		return pkJson(args);
	},
);

// ─── pk_new ───────────────────────────────────────────────────────────────────

server.registerTool(
	'pk_new',
	{
		description: 'Create a new knowledge note. Returns the path to the created file.',
		inputSchema: {
			type: z.enum(['note', 'decision', 'question', 'source']).describe('Note type'),
			title: z.string().describe('Note title'),
			tags: z.string().optional().default('').describe('Comma-separated tags'),
		},
	},
	async ({type, title, tags}) => {
		const args = ['new', type, title, '--json'];
		if (tags) args.push('--tags', tags);
		return pkJson(args);
	},
);

// ─── pk_read ──────────────────────────────────────────────────────────────────

server.registerTool(
	'pk_read',
	{
		description: 'Read the full content of a knowledge note by path. Use paths from pk_search or pk_synthesize.',
		inputSchema: {
			path: z.string().describe('Absolute path to the note'),
		},
	},
	async ({path: p}) => pkJson(['read', p, '--json']),
);

// ─── pk_lint ──────────────────────────────────────────────────────────────────

server.registerTool(
	'pk_lint',
	{
		description: 'Validate knowledge note structure and frontmatter. Returns lint issues by severity.',
		inputSchema: {
			paths: z.array(z.string()).optional().describe('Optional note paths to lint. Absent = all notes.'),
		},
	},
	async ({paths}) => {
		const args = ['lint', '--json'];
		if (paths && paths.length > 0) args.push(...paths);
		return pkJson(args);
	},
);

// ─── pk_history ───────────────────────────────────────────────────────────────

server.registerTool(
	'pk_history',
	{
		description: 'View knowledge history (git commits and notes) with filtering.',
		inputSchema: {
			limit: z.number().int().positive().default(20).describe('Number of entries'),
			type: z.enum(['commits', 'notes', 'all']).optional().describe('History type'),
			filterType: z.enum(['note', 'decision', 'question', 'source']).optional().describe('Filter by note type'),
			filterTag: z.string().optional().describe('Filter by tag'),
			filterOperation: z.enum(['create', 'update', 'delete']).optional().describe('Filter by operation'),
		},
	},
	async ({limit, type, filterType, filterTag, filterOperation}) => {
		const args = ['history', '--json'];
		if (limit) args.push('--limit', String(limit));
		if (type) args.push('--type', type);
		if (filterType) args.push('--filter-type', filterType);
		if (filterTag) args.push('--filter-tag', filterTag);
		if (filterOperation) args.push('--filter-operation', filterOperation);
		return pkJson(args);
	},
);

// ─── pk_delete ────────────────────────────────────────────────────────────────

server.registerTool(
	'pk_delete',
	{
		description: 'Delete a knowledge note. Confirmation is skipped (--json implies --yes).',
		inputSchema: {
			path: z.string().describe('Path to the note file'),
		},
	},
	async ({path: p}) => pkJson(['delete', p, '--json']),
);

// ─── pk_vocab ─────────────────────────────────────────────────────────────────

server.registerTool(
	'pk_vocab',
	{
		description: 'List tags in the knowledge base by frequency. Useful for orienting before searching.',
		inputSchema: {},
	},
	async () => pkJson(['vocab', '--json']),
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
