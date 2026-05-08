---
name: pk
description: "Load when maintaining project knowledge, capturing decisions or questions, looking up what the project knows, organizing notes, running knowledge intake, or initializing a project knowledge base. Keywords: pk, project knowledge, decision log, note, source, question log, knowledge base, intake. Auto-trigger when: agent has read 3+ source files during investigation, produced a proposal or recommendation, or encountered unresolved ambiguity — regardless of user keywords."
---

# pk

Structured project knowledge — intake, search, recall, and audit.

**Search, synthesis, creation, and validation go through MCP tools. Writing note body content uses your standard file Edit tool — but only on paths returned by `pk_new` or `pk_search`, never by navigating the filesystem yourself.**

## Tools

### `pk_synthesize` — orient before any investigation

```
pk_synthesize({ sessionStart: true })                          # open questions + accepted decisions + active notes
pk_synthesize({ query: "auth flow" })                         # ranked context for a topic
pk_synthesize({ query: "auth", type: "decision", limit: 5 })
```

Returns formatted markdown with title, type, status, tags, and an excerpt per note. Use `sessionStart: true` at the start of every session.

### `pk_search` — locate notes by content

```
pk_search({ query: "database schema" })
pk_search({ query: "api", type: "question", status: "open" })
pk_search({ query: "deploy", tag: "infra", limit: 5 })
```

Returns `[{ path, type, status, title, tags, snippet }]`. Always call before `pk_new` — duplicates erode trust faster than gaps do.

### `pk_read` — full note body

```
pk_read({ path: "/abs/path/returned/by/pk_search" })
```

Returns complete file contents including frontmatter. Use paths from `pk_search` or `pk_synthesize` output.

### `pk_new` — create a typed note skeleton

```
pk_new({ type: "note", title: "Auth token expiry behaviour", tags: "auth,security" })
pk_new({ type: "decision", title: "Use JWT over sessions" })
pk_new({ type: "question", title: "Should we rate-limit the search endpoint?" })
pk_new({ type: "source", title: "Meeting notes 2024-06-01" })
```

Returns the absolute path. Frontmatter (id, dates, status, tags as YAML array) is generated automatically from your inputs — you don't edit frontmatter after creation. After receiving the path: call `pk_read` to see the skeleton, then use your standard file Edit tool to fill in the required sections.

**Required sections by type:**
- `note` → `## Summary`, `## Details`, `## Evidence`, `## Related`
- `decision` → `## Decision`, `## Context`, `## Rationale`, `## Consequences`, `## Related`
- `question` → `## Question`, `## Why It Matters`, `## Current Understanding`, `## Resolution`
- `source` → `## Source`, `## Raw Material`, `## Extracted Items`

**`source` vs `note`:** `source` = raw/provenance-heavy input (meeting notes, transcripts, external docs, unprocessed data). `note` = stable synthesised fact or constraint you've derived. When synthesising across multiple sources into one insight: create a `note` and put source paths in `## Evidence`.

### `pk_lint` — validate before committing

```
pk_lint({})
```

**Errors block commits** (missing frontmatter, duplicate id, wrong folder, missing required sections, broken links). **Warnings are advisory** (empty tags, note too long, source marked processed with no extracted items) — fix when practical, not required to commit.

### Status transitions

No MCP tool for status changes. Use your file Edit tool directly on the frontmatter, fill in the resolution section, then lint.

**MANDATORY READ `references/knowledge-model.md`** when: creating a note type you haven't used before, unsure which folder a type belongs in, validating frontmatter fields, or unsure which status values are valid for a given type. (Read with your standard file Read tool — these are local skill files, not MCP-accessible.)

## NEVER

- **NEVER skip `pk_search` before `pk_new`**
  **Why:** Duplicates silently fragment knowledge — two notes on the same topic never get reconciled, and future searches return noise.
  **Instead:** Search first; update the existing note if found, or create and link if genuinely different.

- **NEVER dump raw input into a `note` or `decision`**
  **Why:** Durable note types are for stable, verified claims. Raw input contains noise, ambiguity, and provenance that decays poorly.
  **Instead:** Create a `source` note, then extract `note`/`decision`/`question` entries from it selectively.

- **NEVER silently overwrite a conflicting claim**
  **Why:** Silent overwrites destroy the rationale trail — you lose why the old claim existed.
  **Instead:** Create a new note explaining the conflict, link both, and use `status: superseded` on the old one.

- **NEVER commit when `pk_lint` returns errors or unrelated files are staged**
  **Why:** Lint errors mean required structure is broken; mixed commits make knowledge changes unauditable.
  **Instead:** Fix errors, unstage unrelated files, then commit.
