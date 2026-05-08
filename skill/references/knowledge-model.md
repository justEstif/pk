# Project Knowledge Model

## Scope

This system is project-specific. It is not a personal second brain, a full wiki platform, or a semantic memory database.

The canonical store is plain markdown files managed via the `pk` CLI. The root directory is set by `PK_KNOWLEDGE_DIR`. The knowledge base is for durable context and future answers — not for task tracking.

## Folder and Type Rules

| Type | Subfolder | Purpose | Status values |
| --- | --- | --- | --- |
| `source` | `sources/` | Provenance and raw/lightly cleaned input | `unprocessed`, `processed`, `archived` |
| `note` | `notes/` | Durable project knowledge | `active`, `superseded`, `archived` |
| `decision` | `decisions/` | Chosen direction and rationale | `proposed`, `accepted`, `superseded` |
| `question` | `questions/` | Unresolved or resolved uncertainty | `open`, `answered`, `obsolete` |
| `index` | `indexes/` | Navigation/MOC pages | `active`, `archived` |

## Frontmatter

Required fields only:

```yaml
---
id: note-YYYY-MM-DD-short-slug
type: note
title: Short title
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: active
tags: [tag-one, tag-two]
---
```

Rules:

- `id` must be unique across all notes in the knowledge directory.
- `type` must match both status set and folder.
- `tags` must be a flat list of lowercase slugs.
- Do not use nested YAML, multiline YAML, or relationship arrays.

## Required Sections

### source

- `## Source`
- `## Raw Material`
- `## Extracted Items`

### note

- `## Summary`
- `## Details`
- `## Evidence`
- `## Related`

### decision

- `## Decision`
- `## Context`
- `## Rationale`
- `## Consequences`
- `## Related`

### question

- `## Question`
- `## Why It Matters`
- `## Current Understanding`
- `## Resolution`

### index

- `## Purpose`
- `## Key Links`
- `## Open Questions`
- `## Recent Changes`

## Intake Triage

Classify extracted material this way:

- Raw/provenance-heavy material → `source`
- Stable project fact/explanation/constraint → `note`
- Chosen path with rationale/consequences → `decision`
- Unknown that blocks or informs work → `question`
- Navigation over a topic/type/tag → `index`
- Action item/task → not a knowledge note; track elsewhere
- Low-signal commentary → ignore or keep only in `source`

## Update Policy

Search before creating durable notes.

- Exact or obvious same claim/topic → update existing note, preserving provenance.
- Related but not same → create a new note and link both in body sections.
- Contradictory or superseding claim → do not overwrite silently; explain the conflict and use status/linking.
- Unsure → create or update a `question` note.

## Lint Policy

Hard failures:

- missing frontmatter
- missing required fields
- duplicate `id`
- invalid `type`
- invalid `status` for type
- file in wrong folder for `type`
- required sections missing
- broken internal markdown/wiki links

Warnings:

- empty `tags`
- length threshold exceeded
- `source` marked `processed` with no extracted items

Length warning thresholds:

- `question`: 80 lines
- `decision`: 120 lines
- `note`: 150 lines
- `index`: 200 lines
- `source`: 400 lines

Hard fail non-source notes over 400 lines.
