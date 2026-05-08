# @justestif/pk-mcp

MCP server for [pk](https://github.com/justEstif/pk) — shells out to the `pk` CLI via `--json`.

## Install

```bash
npm install -g @justestif/pk-mcp
```

Requires `pk` CLI on PATH. Install separately:

```bash
npm install -g @justestif/pk
```

## Usage

### Standalone

```bash
PK_KNOWLEDGE_DIR=~/.pk/my-project pk-mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pk": {
      "command": "pk-mcp",
      "env": {
        "PK_KNOWLEDGE_DIR": "/Users/you/.pk/my-project"
      }
    }
  }
}
```

### Via `pk mcp` (recommended)

If `@justestif/pk` is installed, `pk mcp` spawns `pk-mcp` automatically:

```json
{
  "mcpServers": {
    "pk": {
      "command": "pk",
      "args": ["mcp"],
      "env": {
        "PK_KNOWLEDGE_DIR": "/Users/you/.pk/my-project"
      }
    }
  }
}
```

## Tools

| Tool | CLI equivalent |
|---|---|
| `pk_search` | `pk search <query> --json` |
| `pk_synthesize` | `pk synthesize --json` |
| `pk_new` | `pk new <type> <title> --json` |
| `pk_read` | `pk read <path> --json` |
| `pk_lint` | `pk lint --json` |
| `pk_history` | `pk history --json` |
| `pk_delete` | `pk delete <path> --json` |
| `pk_vocab` | `pk vocab --json` |

`pk_edit` is CLI-only (opens `$EDITOR`). Agents use `pk_read` + file edit tools + `pk_lint`.

## Configuration

- `PK_KNOWLEDGE_DIR` — required. Path to the knowledge directory (e.g. `~/.pk/my-project`).
- `PK_COMMAND` — override the `pk` binary path. Defaults to `pk` on PATH.

## Architecture

`pk-mcp` is a thin adapter. Each MCP tool call executes:

```
pk <command> [args...] --json
```

No pk internals are imported. The `--json` output schemas are the stable contract.

## License

MIT
