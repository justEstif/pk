# Git Workflow for Project Knowledge

Git is the audit, safety, and review layer for `knowledge/`.

## Before Modifying Knowledge

Check repository state:

```bash
git status --short
```

Stop before editing if unrelated user changes would be mixed into the same commit. If changes are clearly knowledge-system work in scope, continue.

## After Modifying Knowledge

Run mechanical maintenance:

```bash
scripts/knowledge-index
scripts/knowledge-lint
```

Review what changed:

```bash
git diff -- knowledge scripts/knowledge-* assets/templates hk.pkl
```

Summarize:

- files created
- files updated
- generated indexes
- lint result
- any ignored/deferred material

## Auto-Commit Policy

Auto-commit coherent completed knowledge operations unless a safety stop applies.

Normal intake commits stage only:

```bash
git add knowledge/
```

Knowledge-system implementation commits may stage:

```bash
git add knowledge/ scripts/knowledge-* assets/templates/ hk.pkl
```

Use concise commit messages:

```txt
knowledge: intake <topic>
knowledge: update <topic>
knowledge: answer <topic>
knowledge-system: update <topic>
```

## Safety Stops

Do not auto-commit when:

- unrelated project files are modified
- lint fails
- the edit deletes or rewrites existing knowledge ambiguously
- the working tree contains user changes outside the allowed commit boundary
- the user says not to commit

When stopped, report the exact reason and show the staged/unstaged state.

## Hooks

If hk is used, run `knowledge-lint` on pre-commit only when `knowledge/**/*.md` changes. Avoid every-N-commit scheduling; it is arbitrary and less transparent than change-triggered checks.
