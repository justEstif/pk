# PK Architecture Decisions

## Principles

1. **CLI is the primary interface.** `--json` flag is the integration seam.
2. **Every CLI command gets `--json` output.** That's the contract for programmatic consumers.
3. **Every MCP tool has a CLI equivalent.** The inverse does not hold — some CLI commands are human-only (edit, init).

## Decisions Made

1. **Git commit failure = hard error** (not silent warning)
2. **Single PR** removes Cursor, Gemini, `auto_commit` flag
3. **Three harnesses only:** Claude Code, Codex, OpenCode (no OMP)
4. **`pk_edit` is CLI-only** (opens `$EDITOR`). No MCP equivalent. Agents use `pk_read` + file edit tools + `pk_lint`.
5. **Add `pk_read` CLI command** and **`pk_vocab` MCP tool** to complete symmetry
6. **`pk_lint` accepts optional `paths` array.** No args = all notes. No type/filter — agents chain `pk_search` → `pk_lint`.
7. **Harness setup is context file + skill + eval hook.** No per-harness MCP config.
8. **Project creation extracted from harness wiring** in init.ts
9. **`--json` uses shared `writeJson()` helper and typed output shapes.** All JSON schemas are defined in `src/lib/json-output.ts`.
10. **`lint --json` exits 0 even with errors.** Errors are in the JSON payload.
11. **`delete --json` implies `--yes`.** Machine-readable mode skips confirmation prompts.
12. **`search --json` and `vocab --json` wrap results in objects.** `search` returns `{results: [...]}`, `vocab` returns `{tags: [...]}`.
13. **CLI/MCP symmetry is complete.** CLI-only commands: `edit`, `init`, `index`, `config`.
14. **`pk read` validates path is inside knowledge directory.** Prevents arbitrary file reads.
15. **No formal builder pattern for harnesses.** Switch-case dispatch with per-harness modules.
16. **Per-harness module extraction over monolithic init.ts.** init.ts is orchestration only.
17. **MCP server runs in-process.** `pk mcp` starts the MCP server directly — tools call the same lib functions as CLI commands. No subprocess overhead, no separate package, no version alignment problem.
18. **`pk_edit` excluded from MCP.** Agents use `pk_read` + file edit tools + `pk_lint`.
19. **Dead exports removed.** File-local functions unexported. Re-exports removed from init.ts.

## Reverted Decisions

- **MCPB as separate package** — `@justestif/pk-mcp` was created as a standalone package that shelled out to `pk` CLI. Reverted because: MCPB couldn't work without pk on PATH anyway, pk depended on MCPB (circular dependency in practice), the two-package structure added version alignment complexity without benefit. Folded MCP server back into pk as a single package.

## Assumptions

- Claude Desktop users install pk globally; `pk mcp` works as their MCP server
- `pk` is on PATH for all agent environments
- Cross-note lint checks (duplicate IDs) only fire when scanning all or multiple notes
- Agents can chain tool calls (search → lint) without built-in filters

## Open Questions

- **Multi-project support (#17)** — `pk mcp` could accept a project picker or `PK_KNOWLEDGE_DIR` could be switched at runtime. In-process MCP makes this simpler (no cross-process state).
- **Synthesis architecture (#16)** — deferred, not blocking current work

## Sequencing

1. ~~**Removal PR:** Drop Cursor, Gemini, `auto_commit` (#18)~~ ✅
2. ~~**Deepen Note Validator**~~ ✅
3. ~~**Add `--json` flag**~~ ✅
4. ~~**Add `pk_read` CLI, `pk_vocab` MCP tool**~~ ✅
5. ~~**Revisit Harness Builder**~~ ✅
6. ~~**MCPB package**~~ ✅ then reverted
7. ~~**Architecture and code quality**~~ ✅
8. ~~**Fold MCP back into pk**~~ ✅ — removed MCPB, in-process MCP server

## Related Issues

- #3 — embedding/semantic search
- #13 — profile system for non-project use cases
- #16 — synthesis architecture design question
- #17 — Claude Desktop multi-project support
- #18 — remove Cursor and Gemini harness support
