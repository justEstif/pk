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
	<div class="not-prose">
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">CLI</h1>
		<p class="text-lg text-base-content/60">All commands and flags.</p>
	</div>

	<div class="space-y-4">
		<h2>Commands</h2>
		<div class="not-prose overflow-x-auto rounded-xl border border-base-300">
			<table class="table w-full table-sm font-mono text-sm">
				<thead>
					<tr class="text-xs tracking-widest text-base-content/40 uppercase">
						<th>Command</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody class="text-base-content/70">
					<tr><td>pk init</td><td>Create or connect a knowledge project, write .pk.json, and wire a harness.</td></tr>
					<tr><td>pk prime</td><td>Print session-start context for an agent.</td></tr>
					<tr><td>pk search</td><td>Find notes by keyword or meaning.</td></tr>
					<tr><td>pk new</td><td>Create a note, decision, question, or source.</td></tr>
					<tr><td>pk read</td><td>Print the full contents of a note.</td></tr>
					<tr><td>pk write</td><td>Update a note and commit the change.</td></tr>
					<tr><td>pk delete</td><td>Delete a note and commit.</td></tr>
					<tr
						><td>pk lint</td><td
							>Validate note shape, required sections, and duplicate ids.</td
						></tr
					>
					<tr><td>pk index</td><td>Rebuild the search index and embedding vectors.</td></tr>
					<tr
						><td>pk history</td><td
							>Show episodic store activity from commits and git notes.</td
						></tr
					>
					<tr><td>pk vocab</td><td>List tags by frequency across all notes.</td></tr>
					<tr><td>pk config</td><td>Show or update global configuration.</td></tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="space-y-3">
		<h2>pk new</h2>
		<div class="not-prose">
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
		</div>
		<p>
			Prints the absolute path of the created file. Frontmatter is generated automatically — do not
			edit <code>id</code>, <code>type</code>, or <code>created</code> after creation.
		</p>
	</div>

	<div class="space-y-3">
		<h2>pk search</h2>
		<div class="not-prose">
			<CodeBlock
				label="pk search"
				lines={[
					'pk search "database schema"',
					'pk search "api" --type question --status open',
					'pk search "deploy" --tag infra --limit 5',
					'pk search "slow queries" --semantic'
				]}
			/>
		</div>
		<div class="not-prose overflow-x-auto rounded-xl border border-base-300">
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
				</tbody>
			</table>
		</div>
		<p>When embeddings are configured, search uses hybrid mode (BM25 + vector) automatically.</p>
	</div>

	<div class="space-y-3">
		<h2>pk init</h2>
		<div class="not-prose">
			<CodeBlock
				label="pk init"
				lines={[
					'pk init',
					'pk init my-project --harness claude',
					'pk init my-project --harness claude,opencode'
				]}
			/>
		</div>
		<p>
			Available harnesses: <code>claude</code>, <code>opencode</code>, <code>pi</code>. Without
			flags, pk runs interactively.
		</p>
		<p>
			Writes <code>.pk.json</code> to the current directory. pk commands find the knowledge
			directory by walking up from CWD — no environment variable setup needed.
			Add <code>.pk.json</code> to <code>.gitignore</code>.
		</p>
	</div>

	<div class="space-y-3">
		<h2>Machine output</h2>
		<p>
			Every command accepts <code>--json</code> for structured output. Use <code>--pretty</code> for
			human-readable formatting.
		</p>
		<div class="not-prose">
			<CodeBlock
				label="json output"
				lines={['pk search "pricing" --json', 'pk prime --json', 'pk history --json']}
			/>
		</div>
	</div>
</div>
