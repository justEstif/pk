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
	<meta name="description" content="Install pk, wire it to your AI tool, and seed your knowledge base." />
</svelte:head>

<div class="space-y-10">
	<div class="not-prose">
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">
			Getting started
		</h1>
		<p class="text-lg text-base-content/60">
			Install pk, wire it to your AI tool, and start a session.
		</p>
	</div>

	<!-- Prerequisites -->
	<div class="not-prose rounded-xl border border-base-300 bg-base-200 px-5 py-4">
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
		<h2>1. Install</h2>
		<div class="not-prose mb-3 flex gap-1">
			{#each ['curl', 'bun', 'npm', 'brew'] as const as m}
				<button
					class="rounded-lg px-4 py-2 font-mono text-sm transition-colors
						{pkgMgr === m ? 'bg-base-300 text-primary' : 'text-base-content/40 hover:text-base-content/60'}"
					onclick={() => (pkgMgr = m)}>{m}</button
				>
			{/each}
		</div>
		<div class="not-prose">
			<CodeBlock label="install + init" lines={pkgCmds[pkgMgr]} />
		</div>
		<p>
			Run <code>pk init</code> in your project folder. It creates a knowledge store at
			<code>~/.pk/&lt;project&gt;/</code> and wires up your AI tool automatically.
		</p>
	</div>

	<!-- Step 2: Seed -->
	<div class="space-y-3">
		<h2>2. Tell your agent what you know</h2>
		<p>
			Open your AI tool and tell it about your project. Your agent logs it — you never touch the
			CLI directly.
		</p>
		<div class="not-prose rounded-xl border border-base-300 bg-base-200 px-5 py-4 space-y-3 font-mono text-sm">
			<div class="flex gap-3">
				<span style="color:#D97706" class="shrink-0 font-semibold">You</span>
				<span class="text-base-content/70">log that we decided to use Postgres as the primary database</span>
			</div>
			<div class="flex gap-3">
				<span style="color:#57534E" class="shrink-0 font-semibold">Agent</span>
				<span class="text-base-content/50">Saved to decisions/use-postgres.md</span>
			</div>
		</div>
		<p>
			Log decisions you've already made, open questions, and constraints. The more context your
			agent has on day one, the less time it spends re-deriving what you already know.
		</p>
	</div>

	<!-- Step 3: Start a session -->
	<div class="space-y-3">
		<h2>3. Start a session</h2>
		<p>
			Open your AI tool and type <strong>"use pk skill"</strong>. This loads the playbook that
			tells your agent how to search, log, and update notes.
		</p>
		<div class="not-prose rounded-xl border border-base-300 bg-base-200 px-5 py-4 font-mono text-sm space-y-3">
			<div class="flex gap-3">
				<span style="color:#D97706" class="shrink-0 font-semibold">You</span>
				<span class="text-base-content/70">use pk skill</span>
			</div>
			<div class="flex gap-3">
				<span style="color:#57534E" class="shrink-0 font-semibold">Agent</span>
				<span class="text-base-content/50">Loaded. I can now search your notes, log decisions, track open questions...</span>
			</div>
		</div>
		<p>From then on, your harness injects a session summary automatically — you don't need to ask again.</p>
	</div>

	<!-- Step 4: Embeddings -->
	<div class="space-y-3">
		<div class="not-prose flex items-center gap-2">
			<h2 class="text-xl font-semibold">4. Set up embeddings</h2>
			<span class="badge badge-warning badge-soft font-mono text-xs">recommended</span>
		</div>
		<p>
			Without embeddings, search only matches exact keywords — searching
			<code>database latency</code> won't find a note titled "slow queries." With embeddings, pk
			uses hybrid search automatically. Set it up once.
		</p>
		<div class="not-prose">
			<CodeBlock
				label="embeddings setup"
				lines={[
					'# install Ollama from ollama.com, then:',
					'ollama pull nomic-embed-text',
					'pk config --embedding nomic-embed-text',
					'pk index'
				]}
			/>
		</div>
		<p>
			Runs locally — no GPU required, ~274 MB download.
			<a href="{base}/docs/reference/embeddings">Full setup guide →</a>
		</p>
	</div>

	<!-- Full guide callout -->
	<div
		class="not-prose flex items-center justify-between gap-6 rounded-xl border border-base-300 bg-base-200 px-5 py-5"
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

	<div class="not-prose border-t border-base-300 pt-6">
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
