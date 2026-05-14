<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Reference — pk</title>
	<meta
		name="description"
		content="pk memory model, CLI commands, configuration, and embedding setup."
	/>
</svelte:head>

<div class="space-y-10">
	<div class="not-prose">
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">Reference</h1>
		<p class="text-lg text-base-content/60">The memory model, commands, and configuration.</p>
	</div>

	<section class="space-y-5">
		<h2>How the memory system works</h2>
		<p>
			pk gives your AI agent persistent memory for each project. Notes are stored locally as plain
			markdown — searchable, diffable, and readable by both you and your agent. Nothing leaves your
			machine.
		</p>
		<p>pk separates two kinds of memory: what you know, and what happened.</p>

		<div class="not-prose grid gap-4 sm:grid-cols-2">
			<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4 space-y-2">
				<div class="flex items-center gap-2">
					<span class="badge badge-warning badge-soft font-mono text-xs">semantic</span>
					<span class="font-mono text-xs text-base-content/30">what do we know?</span>
				</div>
				<p class="text-sm font-semibold">Notes, decisions, questions</p>
				<p class="text-sm leading-relaxed text-base-content/60">
					Structured markdown indexed for full-text and semantic search. Your agent queries these
					to answer questions about the project.
				</p>
			</div>
			<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4 space-y-2">
				<div class="flex items-center gap-2">
					<span class="badge badge-info badge-soft font-mono text-xs">episodic</span>
					<span class="font-mono text-xs text-base-content/30">what happened?</span>
				</div>
				<p class="text-sm font-semibold">Git history</p>
				<p class="text-sm leading-relaxed text-base-content/60">
					Every pk command is recorded as a git commit. Your agent can reconstruct a timeline —
					who asked what, when, and what changed.
				</p>
			</div>
		</div>

		<p>
			The semantic store answers <em>"what did we decide about the database?"</em> The episodic
			store answers <em>"when did we make that call, and what happened right before it?"</em>
		</p>

		<p>Knowledge lives in <code>.pk/</code> — local by default, or in <code>~/.pk/&lt;name&gt;/</code> with <code>--global</code>. <code>.pk/config.json</code> records which store the project uses.</p>
		<div class="not-prose grid gap-3 sm:grid-cols-2">
			<div class="overflow-hidden rounded-xl" style="background:#1C1917">
				<div class="px-4 py-2 font-mono text-xs" style="color:#57534E;border-bottom:1px solid #292524">local (default)</div>
				<div class="px-5 py-4 font-mono text-sm leading-loose" style="color:#A8A29E">
					<div style="color:#57534E">your-project/</div>
					<div>&nbsp;&nbsp;<span style="color:#57534E">.pk/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>notes/ decisions/ ...</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#44403C">.index.db &nbsp;← search index</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#44403C">.git/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;← event log</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>config.json</span>&nbsp;<span style="color:#44403C">← written by pk init</span></div>
				</div>
			</div>
			<div class="overflow-hidden rounded-xl" style="background:#1C1917">
				<div class="px-4 py-2 font-mono text-xs" style="color:#57534E;border-bottom:1px solid #292524">global (--global)</div>
				<div class="px-5 py-4 font-mono text-sm leading-loose" style="color:#A8A29E">
					<div style="color:#57534E">~/.pk/</div>
					<div>&nbsp;&nbsp;<span style="color:#57534E">your-project/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>notes/ decisions/ ...</span></div>
					<div style="margin-top:0.5rem;color:#57534E">your-project/</div>
					<div>&nbsp;&nbsp;<span style="color:#57534E">.pk/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>config.json</span>&nbsp;<span style="color:#44403C">← points to ~/.pk/...</span></div>
				</div>
			</div>
		</div>
	</section>

	<section class="space-y-4">
		<h2>Reference pages</h2>
		<div class="not-prose grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each [
				{
					href: `${base}/docs/reference/cli`,
					label: 'CLI',
					desc: 'All commands, flags, and machine output options.'
				},
				{
					href: `${base}/docs/reference/config`,
					label: 'Config',
					desc: 'Project config (.pk/config.json) and global settings (~/.pk/config.json).'
				},
				{
					href: `${base}/docs/reference/embeddings`,
					label: 'Embeddings',
					desc: 'Ollama setup for semantic search.'
				},
				{
					href: `${base}/docs/reference/mcp`,
					label: 'MCP',
					desc: 'Cowork plugin setup, available tools, and log file.'
				}
			] as card}
				<a
					href={card.href}
					class="group rounded-xl border border-base-300 bg-base-200 px-5 py-4 transition-colors hover:bg-base-300 cursor-pointer space-y-1"
				>
					<p class="text-sm font-semibold">{card.label}</p>
					<p class="text-sm text-base-content/60">{card.desc}</p>
					<p class="font-mono text-xs text-primary/60 transition-colors group-hover:text-primary">
						{card.label.toLowerCase()} →
					</p>
				</a>
			{/each}
		</div>
	</section>
</div>
