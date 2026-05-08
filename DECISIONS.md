# PK Architecture Decisions

## Principles

1. **CLI is the primary interface.** `--json` flag is the integration seam. MCPB is a thin shell-out adapter for Claude Desktop only.
2. **Every CLI command gets `--json` output.** That's the contract MCPB parses.
3. **Every MCP tool has a CLI equivalent.** The inverse does not hold — some CLI commands are human-only (edit, init).

## Decisions Made

1. **Git commit failure = hard error** (not silent warning)
2. **Single PR** removes Cursor, Gemini, `auto_commit` flag
3. **Three harnesses only:** Claude Code, Codex, OpenCode (no OMP)
4. **MCPB is a standalone npm package** (`@justestif/pk-mcp`). Shells out to `pk` CLI via `--json`. Zero imports from pk internals. Self-contained bundle (~1 MB).
5. **`pk_edit` is CLI-only** (opens `$EDITOR`). No MCP equivalent. Agents use `pk_read` + file edit tools + `pk_lint`.
6. **Add `pk_read` CLI command** and **`pk_vocab` MCP tool** to complete symmetry
7. **`pk_lint` accepts optional `paths` array.** No args = all notes. No type/filter — agents chain `pk_search` → `pk_lint`.
8. **Harness setup is context file + skill + eval hook.** No per-harness MCP config.
9. **Project creation extracted from harness wiring** in init.ts
10. **`--json` uses shared `writeJson()` helper and typed output shapes.** All JSON schemas are defined in `src/lib/json-output.ts`. MCPB parses these stable schemas.
11. **`lint --json` exits 0 even with errors.** Errors are in the JSON payload (`issues` array with `level: "error"` entries). Human mode still exits 1 on errors.
12. **`delete --json` implies `--yes`.** Machine-readable mode skips confirmation prompts.
13. **`search --json` and `vocab --json` wrap results in objects.** `search` returns `{results: [...]}` not bare array. `vocab` returns `{tags: [...]}` not bare array. Consistency across all commands.
14. **CLI/MCP symmetry is complete.** Every MCP tool has a CLI equivalent. CLI-only commands: `edit`, `init`, `index`, `config`. `pk_read` is new CLI command; `pk_vocab` is new MCP tool.
15. **`pk read` validates path is inside knowledge directory.** Rejects paths outside the knowledge root to prevent arbitrary file reads.
16. **No formal builder pattern for harnesses.** Three harnesses with switch-case dispatch in `applyHarness`. Each harness in its own module under `src/commands/harnesses/`. No `HarnessDefinition` interface — the indirection doesn't earn its keep with only 3 implementations.
17. **Per-harness module extraction over monolithic init.ts.** `init.ts` is orchestration only (~250 lines). Each harness module is self-contained and independently testable. Shared utilities (MCP config, instruction writers) in `harnesses/shared.ts`.
18. **MCPB is a dependency of pk.** `@justestif/pk-mcp` is a workspace dependency of `@justestif/pk`. Both packages version together. Publishing pk automatically pulls the matching MCPB.
19. **`pk mcp` is a thin shell.** Spawns `pk-mcp` binary (provided by `@justestif/pk-mcp`). The real MCP server implementation lives in MCPB. This keeps `@modelcontextprotocol/sdk` out of pk's runtime while maintaining backward-compatible harness configs.
20. **MCPB excludes `pk_edit`.** Edit is CLI-only (opens `$EDITOR`). Agents use `pk_read` + file edit tools + `pk_lint`.
21. **MCPB bundles all dependencies.** `bun build --target node` produces a single self-contained JS file. No `node_modules` needed at runtime.
22. **MCPB `PK_COMMAND` env var**: overrides binary path for testing/custom installs
23. **Dead exports removed.** File-local functions (`extractTypeFromPath`, `slugify`, `skillPath`, instruction helpers) unexported. Re-exports removed from init.ts. Unused dev dependency `ajv` removed.
24. **In-tree MCP server removed.** `src/commands/mcp.ts` no longer contains a full MCP implementation. It spawns `pk-mcp` binary. This removes `@modelcontextprotocol/sdk` from pk's own dependencies.

## Assumptions

- Claude Desktop users are non-devs who need MCPB; all other users have shell access
- `pk` is on PATH for all agent environments
- Cross-note lint checks (duplicate IDs) only fire when scanning all or multiple notes
- Agents can chain tool calls (search → lint) without built-in filters

## Open Questions

- **MCPB project picker (#17)** — runtime switching vs per-project entries. MCPB architecture supports adding `pk_project_list` / `pk_project_switch` tools.
- **Synthesis architecture (#16)** — deferred, not blocking current work

## Sequencing

1. ~~**Removal PR:** Drop Cursor, Gemini, `auto_commit` (#18)~~ ✅ commit `1b38a70`
2. ~~**Deepen Candidate 1:** Note Validator (lint consolidation)~~ ✅ commit `bdcf03e`
3. ~~**Add `--json` flag** to all CLI commands (new seam contract)~~ ✅
4. ~~**Add `pk_read` CLI, `pk_vocab` MCP tool** (complete symmetry)~~ ✅
5. ~~**Revisit Harness Builder** — extracted per-harness modules~~ ✅
6. ~~**MCPB package** — `@justestif/pk-mcp` standalone package~~ ✅
7. ~~**Revisit architecture and code quality** — dead code removal, MCPB as dependency, thin mcp shell~~ ✅

## Related Issues

- #3 — embedding/semantic search
- #13 — profile system for non-project use cases
- #14 — git auto-commit (always-on, no opt-out)
- #16 — synthesis architecture design question
- #17 — Claude Desktop multi-project support
- #18 — remove Cursor and Gemini harness support
