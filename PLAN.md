# PK Architecture Deepening Plan

This document outlines deepening opportunities identified through architectural analysis. The goal is to transform shallow modules into deep ones—improving testability, AI-navigability, and locality.

## Glossary

- **Module** — anything with an interface and an implementation (function, class, package, slice).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

---

## Candidates

### 1. Knowledge Note Validator Module

**Files:** `src/lib/lint.ts`, `src/lib/notes.ts`, `src/lib/schema.ts`

**Problem:** Validation logic is scattered across three tightly-coupled modules. `lint.ts` imports from both `notes.ts` (to get all notes) and `schema.ts` (for validation rules), while `notes.ts` itself contains parsing logic that validation depends on. Understanding what "valid" means requires bouncing between files. The modules are shallow—their interfaces are nearly as complex as their implementations.

**Solution:** Create a `NoteValidator` module with a deep interface: `validateNote(notePath) => ValidationReport`. This module would encapsulate all validation logic (frontmatter schema, required sections, length checks, cross-note uniqueness checks, source extraction checks). The interface would be simple (one function, well-defined return type) but the implementation would hide significant complexity.

**Benefits:** 
- **Locality:** All validation rules and checks live in one place. Adding a new validation rule doesn't require touching three files.
- **Testability:** Tests can validate against the `ValidationReport` interface without needing to know which validation functions were called.
- **AI-navigability:** A single entry point for "is this note valid?" instead of understanding the orchestration across modules.

**Complexity Impact:** Would reduce complexity in `src/lib/lint.ts` and reduce coupling between `notes.ts`, `lint.ts`, and `schema.ts`.

---

### 2. Search Results Formatter

**Files:** `src/commands/search.ts`, `src/lib/db.ts`

**Problem:** `search.ts` has CRAP 132 complexity because the CLI command mixes search logic with output formatting. The `action` handler does knowledge directory resolution, calls `search()`, then handles JSON vs human output, prefetches note bodies concurrently, and formats results. The interface to `db.ts` is shallow—it's essentially a passthrough to SQLite with some result shaping. Understanding "how do I search and format results?" requires reading both files.

**Solution:** Create a `SearchResults` module with a deep interface: `formatSearchResults(results, format) => string | object`. This would encapsulate all formatting logic (JSON serialization, human-readable table format, context inclusion, snippet display). The `search.ts` command would become a thin adapter: resolve directory, call search, call formatter, print.

**Benefits:**
- **Locality:** Formatting rules live in one place. Changing output format doesn't require modifying the command.
- **Leverage:** Callers get multiple output formats (JSON, human, context-rich) through a single interface point.
- **Testability:** Can test formatting logic independently of CLI argument parsing and database queries.

**Complexity Impact:** Would reduce `search.ts` from CRAP 132 to manageable levels by separating formatting from search logic.

---

### 3. Git History Parser

**Files:** `src/lib/git.ts` (specifically `passesFilters`, `parseHistoryEntries`, `parseHistoryLine`)

**Problem:** The git history module has high complexity (CRAP 72 in `passesFilters`) because parsing logic is mixed with filtering logic. `parseHistoryLine` delegates to `parseCommitEntry` and `parseSynthesizeEntry`, but filtering decisions (`passesFilters`) happen at multiple levels. The interface `getHistory(knowledgeDir, opts) => HistoryEntry[]` is shallow—callers must understand the filtering options (`filterType`, `filterTag`, `filterOperation`, `type`) which are implementation details of how git commits are structured.

**Solution:** Create a `GitHistoryQuery` module with a deep interface: `queryHistory(knowledgeDir, query) => HistoryEntry[]`. The query object would be domain-oriented (e.g., `{operations: ['create', 'update'], noteTypes: ['decision'], timeRange: {start, end}}`) rather than exposing git implementation details. The module would internally handle commit parsing, note parsing, and filtering.

**Benefits:**
- **Locality:** All history querying logic (parsing + filtering) lives in one place.
- **Testability:** Can test query parsing and execution independently of git operations.
- **AI-navigability:** Callers think in terms of "what history do I want?" not "how do I filter git log output?"

**Complexity Impact:** Would reduce `passesFilters` from CRAP 72 and simplify the git history interface.

---

### 4. Harness Integration Builder

**Files:** `src/commands/init.ts` (the 557-line command with CRAP 240)

**Problem:** The `init` command is massive because it handles project setup, directory creation, file generation, and harness integration for Claude, Cursor, Gemini, Codex, and OpenCode. Each harness has different file locations, hook formats, and configuration schemas. The command's interface is shallow—it's essentially a procedural script with many branches. Understanding "how do I integrate with a specific harness?" requires reading the entire 679-line file.

**Solution:** Create a `HarnessBuilder` module with a deep interface: `buildHarness(projectConfig, harnessType) => HarnessIntegrationResult`. Each harness would be an adapter behind this interface, encapsulating its specific file paths, hook formats, and configuration needs. The `init` command would become a thin orchestrator: validate project config, iterate through requested harnesses, call `buildHarness`, report results.

**Benefits:**
- **Locality:** Each harness's integration logic lives in one place. Adding a new harness doesn't require modifying the massive init command.
- **Leverage:** Callers get a uniform interface to all harnesses despite their wildly different implementations.
- **Testability:** Can test each harness adapter independently without running the full init flow.

**Complexity Impact:** Would significantly reduce `init.ts` from CRAP 240, making it manageable and easier to extend.

---

### 5. Knowledge Index Operations

**Files:** `src/lib/db.ts`, `src/lib/notes.ts`

**Problem:** `db.ts` imports `validNotes` from `notes.ts` to build the SQLite index, creating coupling. The interface to `db.ts` is shallow—it exposes `rebuild()`, `search()`, and `vocab()` which are thin wrappers around SQL operations. Understanding "how does search work?" requires reading both the database code and the note validation logic it depends on.

**Solution:** Create a `KnowledgeIndex` module with a deep interface: `index(project) => IndexHandle; search(handle, query) => SearchResult[]`. This would encapsulate SQLite operations, note validation, indexing, and FTS search behind a small interface. The index handle would abstract away the database implementation details.

**Benefits:**
- **Locality:** All indexing and search logic lives in one place, including the note validation currently in notes.ts.
- **Leverage:** Callers get search functionality without needing to know about SQLite, FTS5, or note validation.
- **Testability:** Can test indexing and search through the `KnowledgeIndex` interface without touching the filesystem or database schema.

**Complexity Impact:** Would reduce coupling between `db.ts` and `notes.ts` and create a clearer abstraction for search functionality.

---

## Current Complexity Hotspots

As of the latest fallow analysis:

- `src/commands/init.ts:557` - CRAP 240 (CRITICAL)
- `src/commands/search.ts:15` - CRAP 132 (CRITICAL)
- `src/lib/notes.ts:67` - CRAP 132 (CRITICAL)
- `src/lib/git.ts:251` - CRAP 72 (HIGH)

All candidates above target these hotspots directly.

---

## Next Steps

1. Review candidates and prioritize based on user needs
2. For each candidate: design the deepened interface, identify adapters, plan migration
3. Implement one candidate at a time, running tests after each change
4. Update this plan with decisions and progress

---

*Generated: 2026-05-08*
*Analysis based on fallow complexity metrics and architectural exploration*
