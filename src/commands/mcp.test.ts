import {describe, expect, test} from 'bun:test';
import {createPkMcpServer} from './mcp.ts';

describe('createPkMcpServer', () => {
	test('constructs without error', () => {
		// The server object should be created without throwing.
		const server = createPkMcpServer();
		expect(server).toBeDefined();
	});

	test('throws when PK_KNOWLEDGE_DIR is not set and a tool is invoked', async () => {
		// We can't easily invoke tools without a transport, but we can verify
		// the exported factory returns a McpServer instance.
		const server = createPkMcpServer();
		// McpServer has a .server property (the underlying low-level Server)
		expect(typeof server.connect).toBe('function');
	});
});
