<script lang="ts">
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>CLI reference — pk</title>
	<meta
		name="description"
		content="pk command reference — all commands, flags, and machine output options."
	/>
</svelte:head>

<div class="space-y-10">
	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">CLI</h1>
		<p class="text-lg text-base-content/60">All commands and flags.</p>
	</div>

	<!-- Command table -->
	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Commands</h2>
		<div class="overflow-x-auto rounded-xl border border-base-300">
			<table class="table w-full table-sm font-mono text-sm">
				<thead>
					<tr class="text-xs tracking-widest text-base-content/40 uppercase">
						<th>Command</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody class="text-base-content/70">
					<tr><td>pk init</td><td>Create or connect a knowledge project and wire a harness.</td></tr
					>
					<tr><td>pk prime</td><td>Print session-start context for an agent.</td></tr>
					<tr><td>pk search</td><td>Find notes by keyword or meaning.</td></tr>
					<tr><td>pk new</td><td>Create a note, decision, question, or source.</td></tr>
					<tr><td>pk read</td><td>Print the full contents of a note.</td></tr>
					<tr><td>pk write</td><td>Update a note and commit the change.</td></tr>
					<tr><td>pk delete</td><td>Delete a note and commit.</td></tr>
					<tr
						><td>pk lint</td><td>Validate note shape, required sections, and duplicate ids.</td></tr
					>
					<tr><td>pk index</td><td>Rebuild the search index and embedding vectors.</td></tr>
					<tr
						><td>pk history</td><td>Show episodic store activity from commits and git notes.</td
						></tr
					>
					<tr><td>pk vocab</td><td>List tags by frequency across all notes.</td></tr>
					<tr><td>pk config</td><td>Show or update global configuration.</td></tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- pk new -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">pk new</h2>
		<CodeBlock
			label="pk new"
			lines={[
				'pk new note "Title"',
				'pk new decision "Title"',
				'pk new question "Title"',
				'pk new source "Title"',
				'pk new note "Title" --tags auth,security'
			]}
		/>
		<p class="text-sm text-base-content/60">
			Prints the absolute path of the created file. Frontmatter is generated automatically — do not
			edit <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">id</code>,
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">type</code>, or
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">created</code> after creation.
		</p>
	</div>

	<!-- pk search -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">pk search</h2>
		<CodeBlock
			label="pk search"
			lines={[
				'pk search "database schema"',
				'pk search "api" --type question --status open',
				'pk search "deploy" --tag infra --limit 5',
				'pk search "slow queries" --semantic'
			]}
		/>
		<div class="overflow-x-auto rounded-xl border border-base-300">
			<table class="table w-full table-sm font-mono text-sm">
				<thead>
					<tr class="text-xs tracking-widest text-base-content/40 uppercase">
						<th>Flag</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody class="text-base-content/70">
					<tr><td>--type</td><td>Filter by note type: note, decision, question, source</td></tr>
					<tr><td>--status</td><td>Filter by status: open, accepted, superseded…</td></tr>
					<tr><td>--tag</td><td>Filter by tag</td></tr>
					<tr><td>--limit</td><td>Maximum results (default 10)</td></tr>
					<tr
						><td>--semantic</td><td
							>Vector similarity search — requires embeddings configured via pk config</td
						></tr
					>
				</tbody>
			</table>
		</div>
	</div>

	<!-- pk init -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">pk init</h2>
		<CodeBlock
			label="pk init"
			lines={[
				'pk init',
				'pk init my-project --harness claude',
				'pk init my-project --harness claude,opencode'
			]}
		/>
		<p class="text-sm text-base-content/60">
			Available harnesses: <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs"
				>claude</code
			>,
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">opencode</code>,
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">pi</code>. Without flags, pk
			runs interactively.
		</p>
	</div>

	<!-- Machine output -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Machine output</h2>
		<p class="text-sm text-base-content/60">
			Every command accepts <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs"
				>--json</code
			>
			for structured output. Use
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">--pretty</code> for human-readable
			formatting.
		</p>
		<CodeBlock
			label="json output"
			lines={['pk search "pricing" --json', 'pk prime --json', 'pk history --json']}
		/>
	</div>
</div>
