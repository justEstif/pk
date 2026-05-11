<script lang="ts">
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Usage — pk</title>
	<meta
		name="description"
		content="How to work with pk day to day — the daily loop, note types, and search."
	/>
</svelte:head>

<div class="space-y-10">
	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">Usage</h1>
		<p class="text-lg text-base-content/60">How to work with pk day to day.</p>
	</div>

	<!-- Session start -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Starting a session</h2>
		<p class="text-sm leading-relaxed text-base-content/60">
			pk hooks into your AI tool's startup automatically — when you open Claude Code, OpenCode, or
			Pi it injects a summary of open questions and recent decisions into context. You don't need to
			do anything.
		</p>
		<p class="text-sm leading-relaxed text-base-content/60">To see what your agent receives:</p>
		<CodeBlock label="session summary" lines={['pk prime']} />
	</div>

	<!-- Search first -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Search before you create</h2>
		<p class="text-sm leading-relaxed text-base-content/60">
			Before logging anything new, search. Duplicate notes silently fragment your knowledge — two
			notes on the same topic never get reconciled, and future searches return noise.
		</p>
		<CodeBlock
			label="search"
			lines={[
				'pk search "database"',
				'pk search "auth" --type decision',
				'pk search "slow queries" --semantic   # by meaning, not keywords'
			]}
		/>
		<p class="text-sm text-base-content/60">
			If a note already exists, update it. If it's genuinely different, create and link.
		</p>
	</div>

	<!-- Note types -->
	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Choosing a note type</h2>
		<p class="text-sm leading-relaxed text-base-content/60">
			The type shapes how a note is created, searched, and surfaced to your agent.
		</p>
		<div class="space-y-3">
			{#each [{ type: 'decision', when: "You've chosen a direction", example: 'pk new decision "Use Postgres for the events table"', note: 'Include Context and Rationale — future-you needs to know why, not just what.' }, { type: 'note', when: "You've derived a stable fact or constraint", example: 'pk new note "Rate limit is 100 req/min per API key"', note: "Notes shouldn't change unless the project changes. If it might change, use a question instead." }, { type: 'question', when: 'Something is unresolved', example: 'pk new question "Should we self-host the LLM?"', note: "Your agent treats open questions as live uncertainties — it won't guess the answer." }, { type: 'source', when: 'You have raw input to preserve', example: 'pk new source "Sprint planning notes 2026-05-11"', note: 'Paste in the raw material, then extract decisions and notes from it separately.' }] as item}
				<div class="space-y-2 rounded-xl border border-base-300 bg-base-200 px-5 py-4">
					<div class="flex items-center gap-3">
						<span class="font-mono text-xs text-primary/70">{item.type}</span>
						<span class="text-sm text-base-content/50">{item.when}</span>
					</div>
					<div class="rounded bg-base-300 px-3 py-2 font-mono text-xs text-base-content/70">
						{item.example}
					</div>
					<p class="text-xs text-base-content/50">{item.note}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Daily loop -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">The daily loop</h2>
		<CodeBlock
			label="typical session"
			lines={[
				'# see what your agent knows',
				'pk prime',
				'',
				'# search before adding anything new',
				'pk search "topic"',
				'',
				'# create a new entry',
				'pk new decision "..."',
				'',
				'# validate before committing',
				'pk lint'
			]}
		/>
	</div>

	<!-- Reading and writing -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Reading and updating notes</h2>
		<p class="text-sm text-base-content/60">
			Use paths from <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs"
				>pk search</code
			>
			or
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">pk new</code> output. Always read
			before writing.
		</p>
		<CodeBlock
			label="read then write"
			lines={[
				'pk read /path/from/search',
				'',
				'# edit the content, then write it back:',
				"pk write /path/from/search <<'EOF'",
				'---',
				'...frontmatter unchanged...',
				'---',
				'',
				'## Decision',
				'Updated content here.',
				'EOF'
			]}
		/>
		<p class="text-sm text-base-content/60">
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">pk write</code> commits the
			change atomically. The frontmatter
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">id</code>,
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">type</code>, and
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">created</code> must not change.
		</p>
	</div>
</div>
