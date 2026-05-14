---
name: pk
description: "Load when maintaining project knowledge, capturing decisions or questions, looking up what the project knows, organizing notes, running knowledge intake, or initializing a project knowledge base. Keywords: pk, project knowledge, decision log, note, source, question log, knowledge base, intake. Auto-trigger when: agent has read 3+ source files during investigation, produced a proposal or recommendation, or encountered unresolved ambiguity — regardless of user keywords."
---

# pk

Structured project knowledge — intake, search, recall, and audit.

Use the `pk` CLI for all operations. Output is JSON by default; use `--pretty` for human-readable. Never read or write knowledge files directly.

**MANDATORY READ `references/knowledge-model.md`** when: creating a note type you haven't used before, unsure which folder a type belongs in, validating frontmatter, or unsure which status values are valid.

## Commands

```bash
# Orient at session start
pk synthesize --session-start

# Search before creating anything
pk search "query"
pk search "query" --type decision --status open --tag infra --limit 5

# Read full content
pk read /abs/path/from/search

# Create — prints path; read skeleton, fill sections, then write back
pk new note "Title" --tags auth,api
pk new decision "Title"
pk new question "Title"
pk new source "Title"

# Write back (always pk read first; never change id, type, or created)
pk write /abs/path <<'EOF'
---frontmatter---
## Section
Content.
EOF

# Validate (run after every write)
pk lint
pk lint path1 path2

# History, tags, index
pk history --limit 20 --filter-type decision
pk vocab
pk index
```

**`source` vs `note`:** `source` = raw input (meeting notes, transcripts, external docs). `note` = stable synthesised fact you've derived. Extract notes from sources; never dump raw input into a `note`.

## NEVER

- **NEVER skip `pk search` before `pk new`** — duplicates fragment knowledge silently; future searches return noise.
- **NEVER dump raw input into a `note` or `decision`** — create a `source` first, then extract stable claims.
- **NEVER silently overwrite a conflicting claim** — explain the conflict, link both, mark old as `status: superseded`.
- **NEVER commit when `pk lint` returns errors** — fix errors before writing back.
