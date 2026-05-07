# @justestif/pk — agent instructions

## Gate

Run before every commit:

```bash
make check   # typecheck + lint + test
make build   # compile dist/index.js
```

## Source

All source in `src/`. Bun + TypeScript.

## Release

1. `npm version patch|minor|major` — updates package.json, commits, tags
2. `git push origin main --tags`
3. Create GitHub release from the tag — triggers publish.yml

## Rules

- No direct commits to main
- `make check` must pass before any commit
- `dist/` is gitignored — built in CI
