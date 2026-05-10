# pk site

Marketing and docs site for [pk](https://github.com/justEstif/pk) — deployed to GitHub Pages at [justestif.github.io/pk](https://justestif.github.io/pk/).

Built with SvelteKit (static adapter), Tailwind CSS v4, and DaisyUI v5.

## Routes

| Route                | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `/`                  | Landing page                                                     |
| `/docs/how-it-works` | How the pk memory system works                                   |
| `/docs/setup`        | Interactive step-by-step setup wizard (linked from docs sidebar) |
| `/design-system`     | Live design system reference                                     |

## Developing

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
npm run preview   # preview production build locally
```

## Deploy

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy-site.yml`) which builds and deploys `site/build/` to the `gh-pages` branch.
