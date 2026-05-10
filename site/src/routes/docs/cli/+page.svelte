<script lang="ts">
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>CLI — pk</title>
	<meta
		name="description"
		content="pk command reference for creating, searching, reading, and maintaining project knowledge."
	/>
</svelte:head>

<div class="space-y-10">
	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">CLI</h1>
		<p class="text-lg text-base-content/60">
			The commands agents and humans use to work with project knowledge.
		</p>
	</div>

	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Daily loop</h2>
		<CodeBlock
			label="common commands"
			lines={[
				'pk prime',
				'pk search "database latency"',
				'pk new decision "Use Postgres for events"',
				'pk read decisions/2026-05-10-use-postgres-for-events.md'
			]}
		/>
		<p class="text-sm leading-relaxed text-base-content/60">
			Use <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">--json</code> when another
			tool or agent needs machine-readable output.
		</p>
	</div>

	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Core commands</h2>
		<div class="overflow-x-auto rounded-xl border border-base-300">
			<table class="table w-full table-sm font-mono text-sm">
				<thead>
					<tr class="text-xs tracking-widest text-base-content/40 uppercase">
						<th>Command</th>
						<th>Use</th>
					</tr>
				</thead>
				<tbody class="text-base-content/70">
					<tr><td>pk init</td><td>Create or connect a knowledge project and wire a harness.</td></tr
					>
					<tr><td>pk prime</td><td>Print session-start context for an agent.</td></tr>
					<tr><td>pk search</td><td>Find notes in the semantic store.</td></tr>
					<tr><td>pk new</td><td>Create a source, note, decision, or question.</td></tr>
					<tr><td>pk read</td><td>Read a specific knowledge file.</td></tr>
					<tr
						><td>pk lint</td><td>Validate note shape, required sections, and duplicate ids.</td></tr
					>
					<tr><td>pk index</td><td>Rebuild generated indexes and search data.</td></tr>
					<tr
						><td>pk history</td><td>Show episodic store activity from commits and git notes.</td
						></tr
					>
				</tbody>
			</table>
		</div>
	</div>

	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Machine output</h2>
		<CodeBlock
			label="json"
			lines={['pk search "pricing" --json', 'pk prime --json', 'pk history --json']}
		/>
	</div>
</div>
