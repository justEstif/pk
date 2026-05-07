.PHONY: check build test typecheck lint clean

check:
	bun run check

build:
	bun run build

test:
	bun test

typecheck:
	bunx tsc --noEmit

lint:
	bunx eslint src/

clean:
	rm -f dist/index.js
