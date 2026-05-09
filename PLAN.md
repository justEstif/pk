# pk v1 Hardening Plan

## 1. Fix the website — remove phantom harnesses

The website (`docs/index.html`) lists **Cursor** and **Gemini CLI** as supported harnesses. Neither exists in `src/commands/init.ts` — actual harnesses are `claude`, `codex`, `opencode`. Shipping false claims burns trust on first contact.

- Remove Cursor and Gemini CLI from `docs/index.html` harness list, or implement them
- Verify the harness list in README matches reality

## 2. Document prerequisites

README says "Requires Bun." Actual dependency chain:

- **Git** — hard dependency for init, new, edit, delete, history, synthesize
- **Git notes** — used by history and synthesize; not a feature most devs think about
- **GPG signing** — `commit.gpgsign=true` globally causes `pk init` to hang (PR #32 worked around it, but the prerequisite isn't documented)
- **Bun** — only listed requirement

Deliverables:
- Add prerequisites section to README: git, bun
- Add GPG signing note/caveat
- Surface prerequisites on the website or in `pk init` output

## 3. `pk init` validation — guard the front door

`pk init` is the first command every user runs. It currently doesn't verify:

- Git is installed and on PATH
- Target directory is writable
- What the user should do next

Deliverables:
- Check `git` is available; fail with a clear message if not
- Verify `~/.pk/` is writable
- Print actionable "next steps" in the outro (e.g., `pk new note "First note"`, `pk search <query>`)
- Add e2e test for `pk init` re-run on existing project

## 4. Gap tests — cover the edges that pager at 3am

E2E surface coverage is good but critical edge cases are missing:

- **`pk init` when git is not installed** — does it fail clearly or silently?
- **Duplicate note titles** — `pk new` with a title that already exists. Documented flow is search-then-create, but no enforcement.
- **Corrupted frontmatter** — one lint test exists (missing fields). Add: non-UTF8, missing `---` delimiters, YAML parse errors, completely empty file.
- **Concurrent access** — two agents running `pk new` simultaneously. What happens to git commits?
- **`pk init` re-run on existing project** — `ensureGitRepo` handles it, but no e2e proof.
- **`pk edit`** — command exists, zero e2e coverage.

Not 50 more tests — just the ones that catch real failures.

## Scope boundary

Everything else is v2+: profiles (#13), semantic search (#3), synthesis architecture (#16). This plan is about making what exists trustworthy for a teammate who's never seen pk before.
