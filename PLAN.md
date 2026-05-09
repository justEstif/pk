# pk v1 Plan

## 1. Episodic store — git as event log

Git currently records only file mutations. Extend it to capture all pk operations.

- Add `writeEvent(tag, metadata)` to `git.ts` — appends a git note to HEAD
- Wire into `prime.ts` (session-open event), `search.ts` (search+result count), `synthesize.ts` (enrich existing note format)
- Extend `getHistory()` to parse the new note formats and interleave with commit entries
- `git log` stays clean (mutations only). `pk history` shows the full timeline

No harness changes. Events are side effects of pk CLI calls the agent already makes.

## 2. Synthesis — two-store assembly

`pk synthesize` currently reads only the semantic store. Extend it to pull recent episodic events.

- Add `selectEvents(knowledgeDir, query, opts)` — queries git history matching a topic
- `formatSynthesizeOutput` gains a "Recent activity" section from the episodic store
- `--session-start` includes recent events alongside open questions and active decisions

## 3. Hybrid search — embeddings in the semantic store

FTS-only search misses paraphrase. Add vector embeddings alongside FTS5.

- Add `note_vectors` table to `.index.db` (id, path, vector as BLOB)
- Define `EmbeddingProvider` interface: `embed(text) → float[]`, `dimensions() → int`
- Implement `OllamaProvider` (nomic-embed-text) and `OpenAIProvider` (text-embedding-3-small)
- `pk rebuild` gains embedding pass: FTS insert → embed → vector insert, with progress output
- `pk search` runs hybrid when vectors exist: FTS BM25 + cosine similarity, fused. FTS-only when unconfigured
- No `--semantic` flag — hybrid is automatic when embeddings are present
- `pk config --embedding` already exists as placeholder; make it functional

## 4. Hardening

Trustworthy for a teammate who's never seen pk before.

- Fix website harness list — remove phantom entries (Cursor, Gemini CLI)
- Document prerequisites (git, bun, GPG signing caveat)
- `pk init` validation — verify git on PATH, writable target, actionable next steps
- Edge case tests — duplicate titles, corrupted frontmatter, concurrent access, `pk init` re-run

## Scope boundary

Not v1: profiles (#13), multi-agent scoping, incremental embedding at `pk new` time, explicit session markers, LLM-powered synthesis.

## Dependency order

Items 1 and 3 are independent — can be built in parallel. Item 2 depends on item 1 (needs episodic events to exist). Item 4 is independent throughout.
