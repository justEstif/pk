# PK Architecture Plan

## Architecture Principle

**CLI is the primary interface.** `--json` flag is the integration seam. MCPB is a thin shell-out adapter for Claude Desktop only. Every MCP tool has a CLI equivalent; the inverse does not hold.

See DECISIONS.md for the full decision log.

## Progress

- [x] **Step 1: Removal PR** — Drop Cursor, Gemini, `auto_commit` (#18, commit `1b38a70`)
- [ ] **Step 2: Deepen Note Validator** — consolidate lint.ts + schema.ts + notes.ts validation
- [ ] **Step 3: Add `--json` flag** — consistent JSON output on all CLI commands (MCPB seam)
- [ ] **Step 4: Add `pk_read` CLI, `pk_vocab` MCP tool** — complete CLI/MCP symmetry
- [ ] **Step 5: Revisit Harness Builder** — may not need formal builder pattern post-simplification
- [ ] **Step 6: MCPB package** — separate Node.js package, shells out to `pk` CLI

## Deepening Candidates

### 1. Knowledge Note Validator (NEXT)

**Files:** `src/lib/lint.ts`, `src/lib/notes.ts`, `src/lib/schema.ts`

**Problem:** Validation logic is scattered across three tightly-coupled modules. Understanding what "valid" means requires bouncing between files.

**Solution:** Consolidate into a deep `validateNote(path) => ValidationReport` interface. `pk_lint` accepts optional `paths` array — absent = all notes, present = only those. No filters (agents chain `pk_search` → `pk_lint`). Cross-note checks (duplicate IDs) fire when scanning all or multiple notes.

**Interface:**
```
pk lint                           → all notes
pk lint notes/foo.md dec/bar.md   → specific notes
pk_lint({})                       → all notes
pk_lint({ paths: [...] })         → specific notes
```

### 2. Search Results Formatter (DEFERRED)

**Files:** `src/commands/search.ts`, `src/lib/db.ts`

**Problem:** CRAP 132 — CLI command mixes search logic with output formatting. Compounded by the need for `--json` output (step 3).

**Solution:** Extract formatting into a `SearchResults` module. The `--json` flag work (step 3) will force this separation naturally.

### 3. Git History Parser (DEFERRED)

**Files:** `src/lib/git.ts`

**Problem:** `passesFilters` at CRAP 72. Parsing mixed with filtering.

**Solution:** Domain-oriented query interface. Lower priority since we already reduced `parseHistoryLine` from CRAP 306 → 42.

### 4. Harness Integration (SIMPLIFIED)

**Files:** `src/commands/init.ts`

**Original problem:** 679 lines, CRAP 240, 5 harnesses with different MCP config formats.

**After removals:** Three harnesses (Claude Code, Codex, OpenCode). CLI-first means no per-harness MCP config. Harness setup is now: context file + skill + eval hook. The builder pattern may be overkill — reassess after step 5.

### 5. Knowledge Index Operations (DEFERRED)

**Files:** `src/lib/db.ts`, `src/lib/notes.ts`

**Problem:** `db.ts` imports `validNotes` from `notes.ts`, creating coupling.

**Lower priority** — the coupling is contained and doesn't block other work.

## Related Issues

- #3 — embedding/semantic search
- #13 — profile system for non-project use cases
- #14 — git auto-commit (DONE — always-on, no opt-out)
- #16 — synthesis architecture design question
- #17 — Claude Desktop multi-project support
- #18 — remove Cursor and Gemini harness support (DONE)

---

*Updated: 2026-05-08*
