<script lang="ts">
	import { base } from '$app/paths';
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Usage — pk</title>
	<meta
		name="description"
		content="Your agent runs pk automatically. Here's what's happening and what you do."
	/>
</svelte:head>

<div class="space-y-10">
	<div class="not-prose">
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">Usage</h1>
		<p class="text-lg text-base-content/60">
			Your agent runs pk automatically. Here's what's happening and what you do.
		</p>
	</div>

	<!-- What's automatic -->
	<div class="space-y-3">
		<h2>What's automatic</h2>
		<p>
			On your first session, type <strong>"use pk skill"</strong> to orient your agent. After that,
			your harness injects a session summary automatically 																									— you don't need to do anything.
		</p>
		<p>
			During the session, your agent searches, creates, reads, and updates notes on its own. You
			don't run pk commands manually.
		</p>
	</div>

	<!-- Your job -->
	<div class="space-y-4">
		<h2>Your job</h2>
		<p>Two things — mostly just at the start of a project.</p>

		<div class="not-prose space-y-4">
			<div class="flex gap-4 border-b border-base-300 pb-4">
				<span class="w-6 shrink-0 font-mono text-xs text-primary/60 pt-0.5">1</span>
				<div class="space-y-2">
					<p class="text-sm font-semibold">Seed the knowledge base</p>
					<p class="text-sm text-base-content/60">
						Open your AI tool and tell it about your project — decisions already made, open
						questions, constraints. Your agent logs them. You never touch the CLI directly.
					</p>
				</div>
			</div>
			<div class="flex gap-4">
				<span class="w-6 shrink-0 font-mono text-xs text-primary/60 pt-0.5">2</span>
				<div class="space-y-2">
					<p class="text-sm font-semibold">Set up embeddings — once</p>
					<p class="text-sm text-base-content/60">
						Without embeddings, search only matches exact keywords. With them, search is hybrid —
						your agent finds notes by meaning automatically, no flags needed.
					</p>
					<a href="{base}/docs/reference/embeddings" class="link link-primary text-sm"
						>Set up embeddings →</a
					>
				</div>
			</div>
		</div>
	</div>

	<!-- Note types -->
	<div class="space-y-4">
		<h2>What gets logged</h2>
		<p>
			Your agent picks the type. When you seed manually, pick based on what it represents.
		</p>
		<div class="not-prose">
			{#each [
				{ label: 'decision', desc: "A chosen direction with context and rationale." },
				{ label: 'note', desc: "A stable fact or constraint." },
				{ label: 'question', desc: "An unresolved uncertainty — stays open until answered." },
				{ label: 'source', desc: "Raw input — a Slack thread, meeting notes, a doc." }
			] as t}
				<div class="flex gap-4 border-b border-base-300 py-2.5 last:border-0">
					<span class="w-20 shrink-0 font-mono text-xs text-primary/70 pt-0.5">{t.label}</span>
					<span class="text-sm text-base-content/60">{t.desc}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- How search works -->
	<div class="space-y-3">
		<h2>How search works</h2>
		<p>
			Without embeddings configured, <code>pk search</code> uses keyword matching. With embeddings,
			it uses hybrid search — BM25 and vector results merged automatically. Your agent gets better
			matches with no extra effort.
		</p>
		<p>
			No flags to add. Configure embeddings once and every search improves.
		</p>
	</div>
</div>
