# pk

Structured project memory for AI agents. Decisions, questions, notes, and sources — organized, searchable, stored locally.

## Install

**One-liner (macOS / Linux):**

```bash
curl -fsSL https://justestif.github.io/pk/install.sh | bash
```

**Or manually:**

```bash
# npm
npm install -g @justestif/pk

# bun
bun install -g @justestif/pk

# Homebrew
brew install justEstif/tap/pk
```

Requires:

- [Git](https://git-scm.com) — tracks all knowledge operations via commits and git notes
- [Bun](https://bun.sh) — runtime

> **Note:** If you have GPG commit signing enabled globally (`commit.gpgsign=true`), `pk init` bypasses it for the knowledge repo to avoid interactive prompts. No configuration needed.

## Setup

```bash
pk init
```

> **Tip:** You can override the knowledge directory at any time by setting `PK_KNOWLEDGE_DIR` in your shell or a `.env` file your shell loads:
>
> ```bash
> export PK_KNOWLEDGE_DIR=~/.pk/my-project
> ```
>
> All pk commands read this variable directly — no re-init needed. This is also how you switch between projects without changing harness config.

Interactive: picks a project name and one or more harnesses (space to toggle, enter to confirm).

Non-interactive:

```bash
pk init --harness claude                        # local: knowledge in .pk/ (default)
pk init my-project --harness claude --global   # global: knowledge in ~/.pk/my-project/
pk init my-project --harness claude,opencode --global   # multiple harnesses
pk init my-project --harness cowork --global          # Cowork (Claude's agentic tab)
```

Available harnesses: `claude` (Claude Code), `opencode` (OpenCode), `pi` (Pi), `cowork` (Cowork).

`pk init` does five things:

1. Creates the knowledge store — in `.pk/` (local, default) or `~/.pk/<name>/` (with `--global`)
2. Writes `.pk/config.json` so pk commands find the knowledge directory by walking up from CWD
3. Adds `.pk/` to your project's `.gitignore`
4. Installs a hook or plugin that calls `pk prime` to inject context at session start
5. Installs the pk skill so your agent knows how to use the CLI

| Harness           | Files written                                                                  |
| ----------------- | ------------------------------------------------------------------------------ |
| `claude`          | `.claude/hooks/pk-eval.ts`, `.claude/settings.json`                            |
| `opencode`        | `.opencode/plugins/pk-eval.ts`                                                 |
| `pi`              | `.pi/extensions/pk-eval.ts`                                                    |
| `cowork`          | `~/.pk/<name>-cowork/` (Cowork plugin dir — `claude --plugin-dir`)             |

> **Cowork harness** (`cowork`) creates a plugin directory at `~/.pk/<name>-cowork/` and bundles the pk skill inside it. Use `--global` since Cowork doesn't run inside a project folder. Install with `claude --plugin-dir ~/.pk/<name>-cowork` or upload via the Cowork UI.

> **Override:** `PK_KNOWLEDGE_DIR` env var takes precedence over `.pk/config.json` if you need to point at a different project temporarily.

## Commands

```bash
pk init [name] [--harness h1,h2,...]   # set up project + hooks

pk new <type> <title> [--tags t1,t2]
pk delete <path>                       # JSON output, non-interactive
pk search <query> [--limit 5] [--type] [--status] [--tag]
pk synthesize [query] [--all]
pk history [--limit 20] [--type <type>] [--filter-type <type>] [--filter-tag <tag>] [--filter-operation <op>]
pk read <path>
pk write <path>                        # write content from stdin + commit
pk vocab
pk index                               # rebuild FTS5 + markdown indexes
pk lint [paths...]
pk prime                               # output priming context for hooks
pk mcp                                 # start MCP server (used by Cowork harness)
pk instructions <command>
pk config [--embedding <model>] [--no-embedding] [--base-url <url>]
```

All commands output JSON by default. Use `--pretty` for human-readable output.

### Note types

| Type       | Purpose                                            |
| ---------- | -------------------------------------------------- |
| `note`     | Durable project knowledge                          |
| `decision` | Chosen direction with rationale and consequences   |
| `question` | Unresolved uncertainty that blocks or informs work |
| `source`   | Raw input preserved for provenance                 |
| `index`    | Navigation/map-of-content over a topic or tag      |

### Example

```bash
pk init --harness claude
pk new decision "Use SQLite for search index" --tags search,architecture
pk new question "Should we support multi-project mode?" --tags scope
pk index
pk search "sqlite"
pk synthesize
```

## Knowledge structure

Notes live as plain markdown files — human-editable and git-diffable.
Agents read and write them exclusively through the CLI. Humans can edit files directly, but should run `pk write <path> < <file>` or commit manually afterward to keep the git history clean.

**Local** (default — `.pk/` in your project):

```
your-project/
  .pk/
    notes/
    decisions/
    questions/
    sources/
    indexes/        ← generated by pk index
    .index.db       ← FTS5 search index, gitignored
    config.json     ← points to this knowledge store
```

**Global** (`--global` — shared across machines, survives project moves):

```
~/.pk/
  <project-name>/
    notes/ decisions/ questions/ sources/ ...
```

Run `pk index` after creating or editing notes to update `.index.db` and `indexes/`.

`pk vocab` lists all tags by frequency — useful for orienting before searching.

`pk history` shows all knowledge operations (create, update, delete) as git commits and synthesize operations as git notes. Supports filtering by type, tag, and operation.

## Embeddings (optional)

pk can generate embeddings via a local [Ollama](https://ollama.com) model and store them alongside the FTS5 index. Once configured, `pk search` automatically uses hybrid search — BM25 keyword ranking fused with vector similarity via RRF.

```bash
# Install Ollama — https://ollama.com
ollama pull nomic-embed-text

# Enable embeddings
pk config --embedding nomic-embed-text

# Rebuild index to generate embeddings
pk index

# Search now uses hybrid automatically
pk search "slow database queries"
```

Embeddings are stored in `.index.db` and rebuilt on `pk index`. If no embedding model is configured, search falls back to keyword-only FTS.

## License

MIT
