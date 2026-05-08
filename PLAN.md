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
- [ ] **Step 7: Revisit architecture and code quality** — deepen remaining shallow modules, reduce CRAP scores, tighten abstractions

## Step 3 Completed

**What changed:**
- Created `src/lib/json-output.ts` — shared types (`JsonNewOutput`, `JsonLintOutput`, `JsonSearchOutput`, `JsonSynthesizeOutput`, `JsonHistoryOutput`, `JsonDeleteOutput`, `JsonVocabOutput`) and `writeJson()` helper
- Added `--json` flag to all 7 CLI commands: `new`, `lint`, `search`, `synthesize`, `history`, `delete`, `vocab`
- `search --json` and `vocab --json` already existed — updated to use `writeJson()` and wrap in `{results: [...]}` / `{tags: [...]}` shapes
- `lint --json` exits 0 even with errors — errors are in the JSON `issues` array
- `delete --json` implies `--yes` (skips confirmation in machine-readable mode)
- 8 new e2e tests covering all `--json` outputs

**JSON output schemas:**
- `pk new` → `{path: string}`
- `pk lint` → `{issues: Issue[], noteCount: number}`
- `pk search` → `{results: SearchResult[]}`
- `pk synthesize` → `{notes: SynthesizedNote[], label: string}`
- `pk history` → `{entries: HistoryEntry[]}`
- `pk delete` → `{path: string, status: "deleted"}`
- `pk vocab` → `{tags: Array<{tag: string, count: number}>}`

**Tests:** 102 pass | 0 fail | 221 expect() calls

## Step 6 Completed

**What changed:**
- Created `packages/pk-mcp/` — standalone npm package (`@justestif/pk-mcp`)
- `src/run.ts` — `pkJson()` helper: shells out to `pk` CLI, captures JSON stdout, returns MCP-formatted result
- `src/index.ts` — MCP server with 8 tools: `pk_search`, `pk_synthesize`, `pk_new`, `pk_read`, `pk_lint`, `pk_history`, `pk_delete`, `pk_vocab`
- Each tool maps MCP inputs to CLI flags and delegates to `pkJson()`
- No pk internals imported — only the `pk` binary on PATH. `PK_COMMAND` env var overrides binary path.
- Self-contained bundle via `bun build --target node` (1 MB, includes MCP SDK + zod)
- 6 integration tests verifying `pkJson` against live `pk` CLI
- Added `packages/**` to root xo ignores (separate package, separate lint)
- `pk_edit` excluded from MCPB (CLI-only per decision)

**Tests:** 111 pass (105 root + 6 MCPB) | 0 fail | 243 expect() calls

## Step 4 Completed

**What changed:**
- New `pk read <path>` CLI command — reads note content. Supports `--json` for `{path, content}` output.
- New `pk_vocab` MCP tool — lists tags by frequency. Returns `{tags: Array<{tag, count}>}`.
- `JsonReadOutput` type added to `src/lib/json-output.ts`
- 3 new e2e tests: `pk read --json`, `pk read` plain, `pk read` missing file

**CLI/MCP symmetry now complete:**
- `pk_search` / `pk search`
- `pk_synthesize` / `pk synthesize`
- `pk_new` / `pk new`
- `pk_read` / `pk read` (new CLI)
- `pk_lint` / `pk lint`
- `pk_history` / `pk history`
- `pk_vocab` / `pk vocab` (new MCP)
- `pk_delete` / `pk delete`
- CLI-only (no MCP): `edit`, `init`, `index`, `config`

**Tests:** 105 pass | 0 fail | 228 expect() calls

## Deepening Candidates (Remaining)

### Search Results Formatter
**Files:** `src/commands/search.ts`, `src/lib/db.ts`
CRAP 132. CLI mixes search with formatting. `--json` flag (step 3) forces separation.

### Git History Parser
**Files:** `src/lib/git.ts`
`passesFilters` at CRAP 72. Lower priority after reducing `parseHistoryLine` CRAP 306 → 42.

### Harness Integration
**Files:** `src/commands/init.ts`, `src/commands/harnesses/*.ts`
Extracted to per-harness modules. init.ts is now orchestration only. No further work needed.

### Knowledge Index Operations
**Files:** `src/lib/db.ts`, `src/lib/notes.ts`
Coupling is contained. Lower priority.

## Related Issues

- #3 — embedding/semantic search
- #13 — profile system for non-project use cases
- #14 — git auto-commit (DONE — always-on, flag removed — close issue)
- #16 — synthesis architecture design question
- #17 — Claude Desktop multi-project support
- #18 — remove Cursor and Gemini harness support (DONE, closed)

---

*Updated: 2026-05-08*
