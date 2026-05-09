# Site Migration Plan

## Goal

Make pk accessible to non-technical users who have Claude/Codex access but have never used CLI tools. The current landing page speaks only to developers. The migrated site should serve both audiences.

## Stack

Migrate from plain HTML + custom CSS → **SvelteKit + Tailwind CSS + DaisyUI + mdsvex**

- **SvelteKit** — file-based routing, reusable components, static adapter for GitHub Pages
- **Tailwind + DaisyUI** — built-in dark theme (`night` or `dim`) with minor tweaks; no custom theme from scratch
- **mdsvex** — write docs pages as markdown, drop in Svelte components where needed

The current HTML/CSS/JS is overly complex for what it does. The migration is also a simplification — lean on DaisyUI components instead of hand-rolling everything.

## Repo Structure

```
pk/
  site/                        ← SvelteKit project (everything published)
    src/
      routes/
        +page.svelte           ← landing page
        setup/
          +page.svelte         ← interactive setup wizard
        docs/
          +layout.svelte       ← shared docs layout (sidebar, nav)
          architecture.md      ← migrated from docs/architecture.md
          ...                  ← future doc pages
    static/
      favicon.svg
  docs/                        ← repo-only: architecture, internal notes (not published)
  README.md
```

## Deployment

- GitHub Actions builds `site/` on push to `main`
- Output pushed to `gh-pages` branch
- GitHub Pages serves from `gh-pages` branch
- `docs/` folder is never published — repo-internal only

## Design

Use a built-in DaisyUI dark theme (`night` or `dim`) with minor tweaks. Do not attempt to recreate the current aesthetic from scratch. Landing page is simplified — same core content, DaisyUI components, less custom CSS.

## Site Routes

| Route | Content |
|---|---|
| `/` | Landing page |
| `/setup` | Interactive setup wizard |
| `/docs` | Docs index |
| `/docs/architecture` | Migrated from docs/architecture.md |

## Setup Wizard

Two top-level paths with continuous branching:

```
Are you already set up with Claude Code / Codex?
├── Yes (developer path)
│   └── pkg manager (npm / bun / brew) → install pk → pk init
│
└── No
    ├── Which AI tool do you have? (Claude / Codex / other)
    └── Which OS? (macOS / Windows / Linux)
        → contextual steps with inline explanations
        → install Git + Bun + pk
        → set up chosen harness CLI
        → pk init
```

Each step explains **why** inline. Goal: user finishes understanding what they set up, not just that it works.

## Install Script

A `install.sh` handles OS detection and installs Git + Bun + pk. The wizard calls it as a single step. Serves as the fast lane for developers; the wizard wraps it with education for everyone else.

Prerequisites: Git, Bun, pk. Harness setup (Claude Code / Codex) handled separately in the wizard.

## Feedback / Support

A simple "create a GitHub issue" link is sufficient. Anyone motivated enough to give feedback can make a GitHub account — no form, no backend, no third-party service needed at v0.

## Open Questions

- [ ] Which DaisyUI theme — `night` or `dim`?
- [ ] Windows path requires WSL for Bun — how much hand-holding do we provide?
- [ ] Scaffold empty `/docs` routes now or only when content exists?
- [ ] Where does `install.sh` live — repo root or `site/static/`?
