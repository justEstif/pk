<svelte:head>
	<title>How it works — pk</title>
	<meta name="description" content="How pk stores and retrieves project knowledge — the two-store model explained." />
</svelte:head>

<article class="max-w-none">

	<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-3xl mb-2 not-prose">How it works</h1>
	<p class="text-base-content/50 text-sm font-mono mb-10 not-prose">The memory system behind pk</p>

	<div class="space-y-12">

		<!-- Overview -->
		<section>
			<p class="text-base-content/70 text-lg leading-relaxed">
				pk gives your AI agent a persistent memory for each project. When you log a decision or drop in a note, it's stored locally as a plain markdown file — searchable, diffable, and readable by both you and your agent. Nothing leaves your machine.
			</p>
		</section>

		<!-- Two stores -->
		<section>
			<h2 class="text-xl font-semibold mb-1">Two kinds of memory</h2>
			<p class="text-base-content/60 text-sm mb-6">pk separates what you know from what happened.</p>

			<div class="grid sm:grid-cols-2 gap-4 mb-8">
				<div class="card card-border bg-base-200">
					<div class="card-body gap-3">
						<div class="flex items-center gap-2">
							<span class="badge badge-warning badge-soft font-mono text-xs">semantic</span>
							<span class="font-mono text-xs text-base-content/30">what do we know?</span>
						</div>
						<h3 class="font-semibold">Notes, decisions, questions</h3>
						<p class="text-base-content/60 text-sm leading-relaxed">
							Structured markdown files indexed for full-text search. Your agent queries these to answer questions about the project.
						</p>
					</div>
				</div>
				<div class="card card-border bg-base-200">
					<div class="card-body gap-3">
						<div class="flex items-center gap-2">
							<span class="badge badge-info badge-soft font-mono text-xs">episodic</span>
							<span class="font-mono text-xs text-base-content/30">what happened?</span>
						</div>
						<h3 class="font-semibold">Git history</h3>
						<p class="text-base-content/60 text-sm leading-relaxed">
							Every pk command is recorded as a git commit or note. Your agent can reconstruct a timeline — who asked what, when, and what changed.
						</p>
					</div>
				</div>
			</div>

			<p class="text-base-content/60 text-sm leading-relaxed">
				The two stores complement each other. The semantic store answers <em>"what did we decide about the database?"</em> The episodic store answers <em>"when did we make that call, and what happened right before it?"</em>
			</p>
		</section>

		<!-- Note types -->
		<section>
			<h2 class="text-xl font-semibold mb-1">What gets stored</h2>
			<p class="text-base-content/60 text-sm mb-5">Each note has a type that shapes how it's created, searched, and surfaced.</p>

			<div class="space-y-2">
				{#each [
					{ badge: 'badge-ghost', label: 'note', desc: 'A stable fact or constraint you\'ve derived — something that won\'t change unless the project changes.' },
					{ badge: 'badge-warning badge-soft', label: 'decision', desc: 'A chosen direction with context and rationale. Helps future-you understand why, not just what.' },
					{ badge: 'badge-error badge-soft', label: 'question', desc: 'An unresolved uncertainty. Stays open until explicitly answered — your agent knows not to treat it as settled.' },
					{ badge: 'badge-info badge-soft', label: 'source', desc: 'Raw input preserved for provenance — meeting notes, a Slack thread, an external doc. Not yet synthesized.' },
				] as item}
					<div class="flex gap-4 items-start py-3 border-b border-base-300 last:border-0">
						<span class="badge {item.badge} font-mono text-xs shrink-0 mt-0.5">{item.label}</span>
						<p class="text-base-content/60 text-sm leading-relaxed">{item.desc}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Where it lives -->
		<section>
			<h2 class="text-xl font-semibold mb-1">Where it lives</h2>
			<p class="text-base-content/60 text-sm mb-5">All notes are local, plain markdown — readable and editable without pk.</p>
			<div class="rounded-xl overflow-hidden" style="background:#1C1917">
				<div class="font-mono text-sm px-5 py-4 leading-loose" style="color:#A8A29E">
					<div style="color:#57534E">~/.pk/</div>
					<div>&nbsp;&nbsp;<span style="color:#57534E">your-project/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>notes/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>decisions/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>questions/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span>sources/</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#44403C">.index.db &nbsp;&nbsp;&nbsp;← full-text search index</span></div>
					<div>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#44403C">.git/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;← episodic event log</span></div>
				</div>
			</div>
		</section>

		<!-- How the agent uses it -->
		<section>
			<h2 class="text-xl font-semibold mb-1">How your agent uses it</h2>
			<p class="text-base-content/60 text-sm leading-relaxed mb-4">
				At session start, pk injects a summary of open questions and recent decisions into the agent's context. The agent can then search, read, and write notes through the pk CLI — the same commands you use yourself.
			</p>
			<p class="text-base-content/60 text-sm leading-relaxed">
				The more you put in, the more useful it gets. A project with ten decisions and a handful of open questions gives your agent real context instead of starting from scratch every session.
			</p>
		</section>

	</div>

</article>
