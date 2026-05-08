# PK Architecture Plan

## Architecture Principle

**CLI is the primary interface.** `--json` flag is the integration seam. MCPB is a thin shell-out adapter for Claude Desktop only. Every MCP tool has a CLI equivalent; the inverse does not hold.

See DECISIONS.md for the full decision log.

## Progress

- [x] **Step 1: Removal PR** — Drop Cursor, Gemini, `auto_commit` (#18, commit `1b38a70`)
- [x] **Step 2: Deepen Note Validator** — commit `bdcf03e`, PR #19 (merged)
- [x] **Step 3: Add `--json` flag** — consistent JSON output on all CLI commands (MCPB seam)
- [ ] **Step 4: Add `pk_read` CLI, `pk_vocab` MCP tool** — complete CLI/MCP symmetry
- [ ] **Step 5: Revisit Harness Builder** — may not need formal builder pattern post-simplification
- [ ] **Step 6: MCPB package** — separate Node.js package, shells out to `pk` CLI

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

## Deepening Candidates (Remaining)

### Search Results Formatter
**Files:** `src/commands/search.ts`, `src/lib/db.ts`
CRAP 132. CLI mixes search with formatting. `--json` flag (step 3) forces separation.

### Git History Parser
**Files:** `src/lib/git.ts`
`passesFilters` at CRAP 72. Lower priority after reducing `parseHistoryLine` CRAP 306 → 42.

### Harness Integration
**Files:** `src/commands/init.ts`
Three harnesses remain. Builder pattern may be overkill — reassess at step 5.

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
