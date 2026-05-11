<script lang="ts">
	import { base } from '$app/paths';
	import CodeBlock from '$lib/CodeBlock.svelte';

	type PkgMgr = 'curl' | 'bun' | 'npm' | 'brew';
	let pkgMgr = $state<PkgMgr>('curl');

	const pkgCmds: Record<PkgMgr, string[]> = {
		curl: ['curl -fsSL https://justestif.github.io/pk/install.sh | bash', 'pk init'],
		bun: ['bun install -g @justestif/pk', 'pk init'],
		npm: ['npm install -g @justestif/pk', 'pk init'],
		brew: ['brew install justEstif/tap/pk', 'pk init']
	};
</script>

<svelte:head>
	<title>Getting started — pk</title>
	<meta name="description" content="Install pk, wire it to your AI tool, and log your first entry." />
</svelte:head>

<div class="space-y-10">
	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">
			Getting started
		</h1>
		<p class="text-lg text-base-content/60">
			Install pk, wire it to your AI tool, and log your first entry.
		</p>
	</div>

	<!-- Prerequisites -->
	<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4">
		<p class="mb-3 font-mono text-xs tracking-widest text-base-content/30 uppercase">
			Prerequisites
		</p>
		<div class="space-y-2">
			{#each [{ name: 'Git', note: 'tracks knowledge operations' }, { name: 'Bun', note: 'runtime and package manager' }] as req}
				<div class="flex items-center justify-between">
					<span class="font-mono text-sm text-base-content/70">{req.name}</span>
					<span class="font-mono text-xs text-base-content/30">{req.note}</span>
				</div>
			{/each}
		</div>
		<p class="mt-3 font-mono text-xs text-primary/60">
			The curl installer handles all of these automatically.
		</p>
	</div>

	<!-- Step 1: Install -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">1. Install</h2>
		<div class="mb-3 flex gap-1">
			{#each ['curl', 'bun', 'npm', 'brew'] as const as m}
				<button
					class="rounded-lg px-4 py-2 font-mono text-sm transition-colors
						{pkgMgr === m ? 'bg-base-300 text-primary' : 'text-base-content/40 hover:text-base-content/60'}"
					onclick={() => (pkgMgr = m)}>{m}</button
				>
			{/each}
		</div>
		<CodeBlock label="install + init" lines={pkgCmds[pkgMgr]} />
		<p class="text-sm text-base-content/60">
			Run <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">pk init</code> inside
			your project folder — not your home directory. It creates a knowledge store at
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs"
				>~/.pk/&lt;project&gt;/</code
			> and wires up your AI tool automatically.
		</p>
	</div>

	<!-- Step 2: First entry -->
	<div class="space-y-4">
		<h2 class="text-xl font-semibold">2. Log your first entry</h2>
		<p class="text-sm text-base-content/60">
			pk has four note types. Start with a decision — something you've already resolved so your
			agent doesn't have to re-derive it.
		</p>
		<CodeBlock
			label="first entry"
			lines={[
				'pk new decision "Use Postgres as the primary database"',
				'# prints a path → open it, fill in Context and Rationale, save'
			]}
		/>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each [
				{ label: 'decision', desc: "A chosen direction with context and rationale." },
				{ label: 'note', desc: "A stable fact or constraint you've derived." },
				{ label: 'question', desc: "An unresolved uncertainty your agent should know about." },
				{ label: 'source', desc: "Raw input — a Slack thread, meeting notes, a doc." }
			] as t}
				<div class="flex gap-3 rounded-lg border border-base-300 px-4 py-3">
					<span class="mt-0.5 shrink-0 font-mono text-xs text-primary/70">{t.label}</span>
					<span class="text-sm text-base-content/60">{t.desc}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Step 3: What the agent sees -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">3. What your agent sees</h2>
		<p class="text-sm leading-relaxed text-base-content/60">
			pk hooks into your AI tool's startup — open Claude Code, OpenCode, or Pi and it
			automatically injects a summary of open questions and recent decisions into context. To see
			it yourself:
		</p>
		<CodeBlock label="session summary" lines={['pk prime']} />
		<p class="text-sm text-base-content/60">
			The more you put in, the more useful it gets. Ten decisions and a handful of open questions
			gives your agent real context instead of starting from scratch every session.
		</p>
	</div>

	<!-- Full guide callout -->
	<div
		class="flex items-center justify-between gap-6 rounded-xl border border-base-300 bg-base-200 px-5 py-5"
	>
		<div>
			<p class="mb-1 text-sm font-semibold">New to AI coding tools?</p>
			<p class="text-sm text-base-content/60">
				The full guide walks through installing Git, Bun, your AI tool, and pk step by step.
			</p>
		</div>
		<a href="{base}/docs/getting-started/full" class="btn btn-outline btn-sm shrink-0"
			>Full guide →</a
		>
	</div>

	<div class="border-t border-base-300 pt-6">
		<p class="text-sm text-base-content/40">
			Something broken or unclear?
			<a
				href="https://github.com/justEstif/pk/issues/new"
				target="_blank"
				rel="noopener"
				class="link">Open a GitHub issue</a
			>
		</p>
	</div>
</div>
