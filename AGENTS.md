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

### First publish (one-time — OIDC cannot be used until package exists on npm)

```bash
make build
npm publish --access public   # requires npm login first
```

After first publish, set up OIDC on npmjs.com:
1. Package Settings → Trusted Publisher → Add GitHub Actions
2. Owner: `justEstif`, Repo: `pk`, Workflow: `publish.yml`
3. Toggle **"Require OIDC"** (easy to miss)
4. Delete the temp token used for first publish

Expect ~6 2FA prompts across these steps.

### Subsequent releases (OIDC)

1. `npm version patch|minor|major` — updates package.json, commits, tags
2. `git push origin main --tags`
3. Create GitHub release from the tag — triggers publish.yml automatically

## Rules

- No direct commits to main
- `make check` must pass before any commit
- `dist/` is gitignored — built in CI
