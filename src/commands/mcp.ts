import type {Command} from 'commander';

export function registerMcp(program: Command): void {
	program
		.command('mcp')
		.description('Start the pk MCP server (stdio transport). PK_KNOWLEDGE_DIR must be set.')
		.action(async () => {
			const bin = Bun.which('pk-mcp');
			if (!bin) {
				console.error('pk-mcp not found. Ensure @justestif/pk-mcp is installed.');
				process.exit(1);
			}

			const proc = Bun.spawn([bin], {
				stdio: ['inherit', 'inherit', 'inherit'],
			});

			process.on('SIGINT', () => {
				proc.kill();
			});
			process.on('SIGTERM', () => {
				proc.kill();
			});

			await proc.exited;
		});
}
