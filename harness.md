# Harness support

pk integrates with agent harnesses that support **shell-level env injection** — so `PK_KNOWLEDGE_DIR` is available to every bash tool call without the agent having to set it manually.

Harnesses that rely only on system-prompt text (e.g. AGENTS.md) are not supported because the agent must then manually prefix every `pk` command, which is fragile and inconsistent.

## Supported harnesses

| Harness | Env injection | Context injection |
|---|---|---|
| **Claude Code** | `SessionStart` hook → `$CLAUDE_ENV_FILE` | `UserPromptSubmit` hook → `additionalContext` |
| **OpenCode** | `shell.env` plugin hook | `chat.system.transform` plugin hook |
| **Pi** | `tool_call` event mutation | `before_agent_start` event |

## How it works

`pk init <name> --harness <harness>` does three things:

1. Creates the knowledge base at `~/.pk/<name>/`
2. Writes a harness-specific plugin/hook file to the project
3. Installs the pk skill to `.agents/skills/pk/` (OpenCode, Pi) or `~/.claude/skills/pk/` (Claude Code)

Each harness uses two hooks: one to inject `PK_KNOWLEDGE_DIR` into the shell so `pk` commands work, and one to prepend `pk prime` output to the system prompt each turn.

## Adding a new harness

A harness is eligible if it provides a hook that can modify the environment for shell/tool execution — not just inject text into the system prompt. Check the harness docs for a `shell.env`, `spawnHook`, `tool_call` mutation, or equivalent before adding support.
