import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import type { HarnessContext } from '../../lib/project.ts';

/**
 * Returns the platform-appropriate Claude Desktop config file path.
 * Throws on Windows (not supported).
 */
function claudeDesktopConfigPath(home: string): string {
   switch (process.platform) {
      case 'darwin': {
         return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      }

      case 'linux': {
         const xdg = process.env.XDG_CONFIG_HOME ?? path.join(home, '.config');
         return path.join(xdg, 'Claude', 'claude_desktop_config.json');
      }

      default: {
         throw new Error(`Claude Desktop harness is not supported on ${process.platform}. Supported: macOS, Linux.`);
      }
   }
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
   try {
      return JSON.parse(await Bun.file(filePath).text()) as Record<string, unknown>;
   } catch {
      return {};
   }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
   mkdirSync(path.dirname(filePath), { recursive: true });
   await Bun.write(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Write or update the Claude Desktop MCP server config entry for this project.
 *
 * Merges into mcpServers — does not overwrite other servers.
 * The server key is "pk-<name>" to avoid collision.
 * command is the absolute path to the pk binary resolved at init time;
 * Claude Desktop launches processes with a minimal PATH (/usr/bin:/bin) that
 * does not include Bun's global bin directory.
 *
 * @param ctx     Harness context with project name and knowledge dir
 * @param pkBin   Absolute path to the pk binary (injectable for testing)
 */
export async function writeClaudeDesktopConfig(ctx: HarnessContext, pkBin?: string): Promise<void> {
   const resolvedBin = pkBin || Bun.which('pk');
   if (!resolvedBin) {
      throw new Error(
         'pk binary not found on PATH. Install pk globally first:\n'
         + '  npm install -g @justestif/pk\n'
         + '  # or: brew install justEstif/tap/pk',
      );
   }

   const home = ctx.home ?? os.homedir();
   const configPath = claudeDesktopConfigPath(home);
   const config = await readJson(configPath);

   const mcpServers = (config.mcpServers as Record<string, unknown> | undefined) ?? {};
   mcpServers[`pk-${ctx.name}`] = {
      command: resolvedBin,
      args: ['mcp'],
      env: { PK_KNOWLEDGE_DIR: ctx.knowledgeDir },
   };
   config.mcpServers = mcpServers;

   await writeJson(configPath, config);
}
