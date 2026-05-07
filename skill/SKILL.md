---
name: pk
description: "Load when maintaining project knowledge, capturing decisions or questions, looking up what the project knows, organizing notes, running knowledge intake, or initializing a project knowledge base. Keywords: pk, project knowledge, decision log, note, source, question log, knowledge base, intake. Auto-trigger when: agent has read 3+ source files during investigation, produced a proposal or recommendation, or encountered unresolved ambiguity — regardless of user keywords."
---

# pk

Structured project knowledge — intake, search, recall, and audit over `knowledge/`.

## Prerequisites

Verify before every operation:

```bash
pk --version 2>/dev/null || npm install -g @justestif/pk
```

## First use in a project

```bash
pk init
```

Creates `knowledge/`, installs Claude Code hook at `.claude/hooks/pk-user-prompt-submit.ts`.
The hook injects open questions, recent decisions, and active notes into every prompt automatically.

## Commands

```bash
pk new <type> <title> [--tags tag1,tag2]   # type: note|decision|question|source
pk search <query> [--context] [--limit 5]
pk synthesize [query] [--all] [--session-start]
pk index                                    # rebuild FTS5 + markdown indexes
pk lint                                     # validate structure — exit 1 on errors
pk instructions <command>                   # full behavioral guide per command
```

Run all commands from the project root (where `knowledge/` lives).

## Intake

**Search before creating** — always run `pk search` first.

- Substantial messy input → `source`. Extract `note`, `decision`, `question` only when durable beyond this session.
- Update existing when the match is obvious; otherwise create and link in body.
- Run `pk lint` before committing. Auto-commit coherent operations only when lint passes and no unrelated files are staged.

## Asking

1. `pk search <query> [--context]`
2. Read top results directly
3. Answer with citations to note paths/IDs
4. If silent or ambiguous, offer to create a `question` note

## NEVER

- **Skip `pk search` before creating** — duplicates erode trust in the knowledge base
- **Dump raw input into durable notes** — preserve in `source`, extract selectively
- **Silently merge related-but-different claims** — create and link instead
- **Auto-commit when lint fails or unrelated files are staged**

## References

Load only when the task requires it:

- `references/knowledge-model.md` — types, folders, frontmatter schema, required sections
- `references/git-workflow.md` — commit policy, safety stops
- `references/source-principles.md` — documentation governance
