---
name: pk
description: "Load when maintaining project knowledge, capturing decisions or questions, looking up what the project knows, organizing notes, running knowledge intake, or initializing a project knowledge base. Keywords: pk, project knowledge, decision log, note, source, question log, knowledge base, intake. Auto-trigger when: agent has read 3+ source files during investigation, produced a proposal or recommendation, or encountered unresolved ambiguity — regardless of user keywords."
---

# pk

Structured project knowledge — intake, search, recall, and audit.

Use the `pk` CLI for all knowledge operations. Every command outputs JSON by default. Use `--pretty` for human-readable output. Never read or write knowledge files directly — always go through `pk`.

## Commands

### `pk synthesize` — orient before any investigation

```bash
pk synthesize --session-start            # open questions + accepted decisions + active notes
pk synthesize "auth flow"                # ranked context for a topic
pk synthesize "auth" --type decision --limit 5
```

Returns formatted markdown with title, type, status, tags, and an excerpt per note. Run `--session-start` at the start of every session.

### `pk search` — locate notes by content

```bash
pk search "database schema"
pk search "api" --type question --status open
pk search "deploy" --tag infra --limit 5
pk search "slow queries"              # hybrid (BM25 + vector) when embeddings indexed
```

Returns path, type, status, title, tags, and snippet per match. Always search before creating — duplicates erode trust faster than gaps do.

When embeddings are configured (`pk config --embedding <model>`) and `pk index` has been run, search is automatically hybrid — BM25 keyword ranking fused with vector similarity. No flag needed.

### `pk read` — full note body

```bash
pk read /abs/path/from/search
```

Returns complete file contents including frontmatter. Use paths from `pk search` or `pk synthesize` output.

### `pk new` — create a typed note skeleton

```bash
pk new note "Auth token expiry behaviour" --tags auth,security
pk new decision "Use JWT over sessions"
pk new question "Should we rate-limit the search endpoint?"
pk new source "Meeting notes 2024-06-01"
```

Prints the absolute path. Frontmatter (id, dates, status, tags) is generated automatically — don't edit frontmatter after creation. After receiving the path: `pk read` to see the skeleton, then fill in the required sections and write it back with `pk write`:

```bash
path=$(pk new source "My topic" | jq -r .path)
pk read "$path"   # inspect the skeleton
# compose the full content, then:
pk write "$path" <<'EOF'
---
...frontmatter unchanged...
---

## Source

...
EOF
```

**Always use `pk write` to save edits** — it writes the file and commits the change atomically.

**Required sections by type:**

- `note` → `## Summary`, `## Details`, `## Evidence`, `## Related`
- `decision` → `## Decision`, `## Context`, `## Rationale`, `## Consequences`, `## Related`
- `question` → `## Question`, `## Why It Matters`, `## Current Understanding`, `## Resolution`
- `source` → `## Source`, `## Raw Material`, `## Extracted Items`

**`source` vs `note`:** `source` = raw/provenance-heavy input (meeting notes, transcripts, external docs, unprocessed data). `note` = stable synthesised fact or constraint you've derived. When synthesising across multiple sources into one insight: create a `note` and put source paths in `## Evidence`.

### `pk lint` — validate before committing

```bash
pk lint              # all notes
pk lint path1 path2  # specific notes
```

**Errors block commits** (missing frontmatter, duplicate id, wrong folder, missing required sections). **Warnings are advisory** (empty tags, note too long) — fix when practical.

### `pk history` — view knowledge operations

```bash
pk history                                    # last 20 operations
pk history --limit 50 --type commits           # only CUD operations
pk history --filter-type decision              # only decisions
pk history --filter-tag important              # only tagged 'important'
pk history --filter-operation update           # only updates
```

### `pk write` — update an existing note

```bash
pk write /abs/path/to/note.md <<'EOF'
---
id: ...
...
---

## Section

Content here.
EOF
```

Writes content to an existing note and commits it as an update. Always `pk read` first, modify the content, then write back. Frontmatter `id`, `type`, and `created` **must not change**.

### `pk delete` — delete a note

```bash
pk delete /abs/path/to/note.md
```

Deletes and commits. The command is non-interactive and outputs JSON by default.

### `pk vocab` — list tags by frequency

```bash
pk vocab
```

Useful for orienting before searching. Requires the search index.

### `pk index` — rebuild search indexes

```bash
pk index
```

Run after creating or editing notes. Rebuilds `.index.db` and `indexes/` inside the project's knowledge directory (`.pk/` for local, `~/.pk/<name>/` for global). If embeddings are configured (`pk config --embedding <model>`), also generates vectors for semantic search.

### `pk config` — show or update global configuration

```bash
pk config                                    # show current config
pk config --embedding nomic-embed-text       # enable Ollama embeddings
pk config --no-embedding                     # disable embeddings
pk config --base-url http://my-ollama:11434  # custom Ollama endpoint
```

Manages global settings at `~/.pk/config.json` (embeddings, base URL). Separate from `.pk/config.json` in the project root, which records which knowledge directory this project uses and is written by `pk init`.

### Status transitions

No dedicated command. Use `pk read` to get the current content, change the `status` field in the frontmatter, then `pk write` to save and commit.

**MANDATORY READ `references/knowledge-model.md`** when: creating a note type you haven't used before, unsure which folder a type belongs in, validating frontmatter fields, or unsure which status values are valid for a given type.

## NEVER

- **NEVER skip `pk search` before `pk new`**
  **Why:** Duplicates silently fragment knowledge — two notes on the same topic never get reconciled, and future searches return noise.
  **Instead:** Search first; update the existing note if found, or create and link if genuinely different.

- **NEVER dump raw input into a `note` or `decision`**
  **Why:** Durable note types are for stable, verified claims. Raw input contains noise, ambiguity, and provenance that decays poorly.
  **Instead:** Create a `source` note, then extract `note`/`decision`/`question` entries from it selectively.

- **NEVER silently overwrite a conflicting claim**
  **Why:** Silent overwrites destroy the rationale trail — you lose why the old claim existed.
  **Instead:** Create a new note explaining the conflict, link both, and use `status: superseded` on the old one.

- **NEVER commit when `pk lint` returns errors or unrelated files are staged**
  **Why:** Lint errors mean required structure is broken; mixed commits make knowledge changes unauditable.
  **Instead:** Fix errors, unstage unrelated files, then commit.
