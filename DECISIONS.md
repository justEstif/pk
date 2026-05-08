# PK Architecture Decisions

## Principles

1. **CLI is the primary interface.** `--json` flag is the integration seam. MCPB is a thin shell-out adapter for Claude Desktop only.
2. **Every CLI command gets `--json` output.** That's the contract MCPB parses.
3. **Every MCP tool has a CLI equivalent.** The inverse does not hold — some CLI commands are human-only (edit, init).

## Decisions Made

1. **Git commit failure = hard error** (not silent warning)
2. **Single PR** removes Cursor, Gemini, `auto_commit` flag
3. **Three harnesses only:** Claude Code, Codex, OpenCode (no OMP)
4. **`src/commands/mcp.ts` kept as reference**, removed when MCPB replaces it
5. **MCPB is a separate Node.js package**, done after deepening
6. **`pk_edit` is CLI-only** (opens `$EDITOR`). No MCP equivalent. Agents use `pk_read` + file edit tools + `pk_lint`.
7. **Add `pk_read` CLI command** and **`pk_vocab` MCP tool** to complete symmetry
8. **`pk_lint` accepts optional `paths` array.** No args = all notes. No type/filter — agents chain `pk_search` → `pk_lint`.
9. **Harness setup is context file + skill + eval hook.** No per-harness MCP config.
10. **Project creation extracted from harness wiring** in init.ts

## Assumptions

- Claude Desktop users are non-devs who need MCPB; all other users have shell access
- `pk` is on PATH for all agent environments
- Cross-note lint checks (duplicate IDs) only fire when scanning all or multiple notes
- Agents can chain tool calls (search → lint) without built-in filters

## Open Questions

- **`--json` output format** — needs a consistent schema across all commands before MCPB can parse it
- **MCPB project picker (#17)** — `user_config` manifest vs runtime `pk_project_switch`. Deferred to MCPB work.
- **Synthesis architecture (#16)** — deferred, not blocking current work

## Sequencing

1. ~~**Removal PR:** Drop Cursor, Gemini, `auto_commit` (#18)~~ ✅ commit `1b38a70`
2. **Deepen Candidate 1:** Note Validator (lint consolidation)
3. **Add `--json` flag** to all CLI commands (new seam contract)
4. **Add `pk_read` CLI, `pk_vocab` MCP tool** (complete symmetry)
5. **Revisit Candidate 4** — may not need formal builder pattern anymore
6. **MCPB package** (separate, after CLI is stable)

## Related Issues

- #3 — embedding/semantic search
- #13 — profile system for non-project use cases
- #14 — git auto-commit (always-on, no opt-out)
- #16 — synthesis architecture design question
- #17 — Claude Desktop multi-project support
- #18 — remove Cursor and Gemini harness support
