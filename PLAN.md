# PK Architecture Plan

## Architecture Principle

**CLI is the primary interface.** `--json` flag is the integration seam. MCPB is a thin shell-out adapter for Claude Desktop only. Every MCP tool has a CLI equivalent; the inverse does not hold.

See DECISIONS.md for the full decision log.

## Progress

- [x] **Step 1: Removal PR** — Drop Cursor, Gemini, `auto_commit` (#18, commit `1b38a70`)
- [x] **Step 2: Deepen Note Validator** — commit `bdcf03e`, PR #19 (merged)
- [x] **Step 3: Add `--json` flag** — consistent JSON output on all CLI commands (MCPB seam)
- [x] **Step 4: Add `pk_read` CLI, `pk_vocab` MCP tool** — complete CLI/MCP symmetry
- [x] **Step 5: Revisit Harness Builder** — extracted per-harness modules, fixed duplicate check bug, removed dead `_name` param
- [x] **Step 5b: Update docs, skill, and stale references** — removed cursor/gemini from README, added pk read/vocab
- [x] **Step 6: MCPB package** — standalone `@justestif/pk-mcp` package, shells out to `pk` CLI
- [x] **Step 7: Revisit architecture and code quality** — dead code removal, MCPB as dependency, thin mcp shell

## Step 7 Completed

**What changed:**
- Removed in-tree MCP server implementation from `src/commands/mcp.ts`. Replaced with thin shell that spawns `pk-mcp` binary.
- Removed `@modelcontextprotocol/sdk` from pk's dependencies (zod still needed by lint.ts).
- Removed `ajv` unused dev dependency.
- Removed 10 dead re-exports from `src/commands/init.ts` (tests import from harness modules directly).
- Unexported file-local functions: `extractTypeFromPath` (git.ts), `slugify` (notes.ts), `skillPath` (prime.ts), `PK_SECTION_START/END`, `PK_INSTRUCTION`, `writeInstructionSection` (harnesses/shared.ts), `applyHarness` (init.ts).
- Set up bun workspaces. `@justestif/pk-mcp` is now a workspace dependency of `@justestif/pk`.
- Added `bin` entry to MCPB package (`pk-mcp`). MCPB builds standalone Node.js bundle with shebang.
- Created MCPB README documenting standalone and `pk mcp` usage.
- Updated skill: removed `pk_edit` from MCP tool list, added editing workflow section, added `pk_vocab` documentation.
- Updated README.md with MCP section linking to MCPB README.
- Updated DECISIONS.md and PLAN.md.

**Tests:** 109 pass | 0 fail | 241 expect() calls

## Deepening Status

All primary deepening targets addressed:
- `src/commands/init.ts` — was CRAP 240, now orchestration-only (~250 lines) with per-harness modules
- `src/commands/search.ts` — clean after `--json` refactor, formatting is simple output logic
- `src/lib/git.ts` — `passesFilters` is 3 simple if-checks after prior refactor
- Dead code removed across 8 files, 2 dependencies

## Remaining Candidates (lower priority)

- `src/commands/lint.ts` (hotspot score 52.6, cooling trend) — CLI command, straightforward
- `src/commands/synthesize.ts` (hotspot score 37.9, cooling trend) — CLI command, straightforward
- `src/lib/db.ts` (hotspot score 23.1, accelerating trend) — FTS5 coupling contained

## Related Issues

- #3 — embedding/semantic search
- #13 — profile system for non-project use cases
- #14 — git auto-commit (DONE — always-on, flag removed)
- #16 — synthesis architecture design question
- #17 — Claude Desktop multi-project support (MCPB is the foundation)
- #18 — remove Cursor and Gemini harness support (DONE, closed)

---

*Updated: 2026-05-08*
