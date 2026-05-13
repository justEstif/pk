import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { parse, stringify } from 'smol-toml';
import type { HarnessContext } from '../../lib/project.ts';

function codexConfigPath(home: string): string {
   return path.join(home, '.codex', 'config.toml');
}

async function readToml(filePath: string): Promise<Record<string, unknown>> {
   try {
      return parse(await Bun.file(filePath).text()) as Record<string, unknown>;
   } catch {
      return {};
   }
}

async function writeToml(filePath: string, data: Record<string, unknown>): Promise<void> {
   mkdirSync(path.dirname(filePath), { recursive: true });
   await Bun.write(filePath, stringify(data));
}

/**
 * Write or update the Codex MCP server config entry for this project.
 *
 * Config path: ~/.codex/config.toml
 * Merges into mcp_servers — does not overwrite other servers.
 * The server key is "pk-<name>".
 *
 * smol-toml is used for safe parse + serialize. Template-based TOML emission
 * is unsafe: project names with dots produce nested tables instead of flat keys.
 *
 * @param ctx     Harness context with project name and knowledge dir
 * @param pkBin   Absolute path to the pk binary (injectable for testing)
 */
export async function writeCodexConfig(ctx: HarnessContext, pkBin?: string): Promise<void> {
   const resolvedBin = pkBin || Bun.which('pk');
   if (!resolvedBin) {
      throw new Error(
         'pk binary not found on PATH. Install pk globally first:\n'
         + '  npm install -g @justestif/pk\n'
         + '  # or: brew install justEstif/tap/pk',
      );
   }

   const home = ctx.home ?? os.homedir();
   const configPath = codexConfigPath(home);
   const config = await readToml(configPath);

   const mcpServers = (config.mcp_servers as Record<string, unknown> | undefined) ?? {};
   mcpServers[`pk-${ctx.name}`] = {
      command: resolvedBin,
      args: ['mcp'],
      env: { PK_KNOWLEDGE_DIR: ctx.knowledgeDir },
   };
   config.mcp_servers = mcpServers;

   await writeToml(configPath, config);
}
