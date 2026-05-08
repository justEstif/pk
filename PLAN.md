# PK Architecture Plan

## Architecture Principle

**CLI is the primary interface.** `--json` flag is the integration seam. MCP server runs in-process — tools call the same lib functions as CLI commands.

See DECISIONS.md for the full decision log.

## Progress

- [x] **Step 1: Removal PR** — Drop Cursor, Gemini, `auto_commit` (#18)
- [x] **Step 2: Deepen Note Validator** — PR #19 (merged)
- [x] **Step 3: Add `--json` flag** — consistent JSON output on all CLI commands
- [x] **Step 4: Add `pk_read` CLI, `pk_vocab` MCP tool** — complete CLI/MCP symmetry
- [x] **Step 5: Revisit Harness Builder** — extracted per-harness modules
- [x] **Step 6: MCPB package** — created, then reverted (see Step 9)
- [x] **Step 7: Architecture and code quality** — dead code removal, db unit tests
- [x] **Step 9: Fold MCP into pk** — removed MCPB package, in-process MCP server

## Step 9: Fold MCP into pk

**Why:** MCPB was a separate package (`@justestif/pk-mcp`) that shelled out to `pk` CLI. It couldn't function without pk on PATH, pk depended on MCPB (workspace), so they always shipped together. The two-package structure added version alignment complexity, bun workspaces, and a 3-process chain (Claude → `pk mcp` → `pk-mcp` → `pk search --json`) without benefit.

**What changed:**
- Deleted `packages/pk-mcp/` entirely
- Restored `src/commands/mcp.ts` as full in-process MCP server
- MCP tools call lib functions directly (search, lintNotes, createKnowledgeNote, etc.)
- Added `@modelcontextprotocol/sdk` back to pk's dependencies
- Removed bun workspaces from package.json
- Removed `packages/**` from xo ignores
- Simplified `pk mcp` to: create server → connect stdio transport → done

**Tests:** 122 pass | 0 fail | 251 expect() calls

## Test Coverage

| Module | Test file | Tests |
|---|---|---|
| `src/lib/db.ts` | `src/lib/db.test.ts` | 19 (search, rebuild, vocab) |
| `src/lib/lint.ts` | `src/lib/lint.test.ts` | 21 |
| `src/lib/notes.ts` | `src/lib/notes.test.ts` | 11 |
| `src/lib/git.ts` | `src/lib/git.test.ts` | 10 |
| `src/lib/paths.ts` | `src/lib/paths.test.ts` | 9 |
| `src/lib/synthesize.ts` | `src/lib/synthesize.test.ts` | 8 |
| `src/lib/operations.ts` | `src/lib/operations.test.ts` | 6 |
| `src/lib/templates.ts` | `src/lib/templates.test.ts` | 7 |
| `src/commands/init.ts` | `src/commands/init.test.ts` | 22 |
| CLI e2e | `src/e2e/cli.test.ts` | 22 |
| **Total** | | **122** |

## Related Issues

- #3 — embedding/semantic search
- #13 — profile system for non-project use cases
- #16 — synthesis architecture design question
- #17 — Claude Desktop multi-project support
- #18 — remove Cursor and Gemini harness support (DONE, closed)

---

*Updated: 2026-05-08*
