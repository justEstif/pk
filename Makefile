.PHONY: check build test typecheck lint clean sync-plugin-skill

check:
	bun run check

build:
	bun run build

test:
	bun test

typecheck:
	bunx tsc --noEmit

lint:
	bunx xo src/

clean:
	rm -f dist/index.js

# Keep plugin/skills/pk/ in sync with skill/ (run before committing changes to skill/)
sync-plugin-skill:
	cp skill/SKILL.md plugin/skills/pk/SKILL.md
	cp -r skill/references/. plugin/skills/pk/references/
