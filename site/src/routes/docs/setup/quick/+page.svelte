<script lang="ts">
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
	<title>Quick setup — pk</title>
</svelte:head>

<div class="space-y-10">
	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">Quick setup</h1>
		<p class="text-lg text-base-content/60">
			Already using Claude Code, OpenCode, or Pi? Two commands.
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

	<div class="card bg-base-200 card-border">
		<div class="card-body">
			<h2 class="mb-1 text-lg font-semibold">Install pk</h2>
			<p class="mb-4 text-sm text-base-content/60">Pick your install method:</p>
			<div class="mb-3 flex gap-1">
				{#each ['curl', 'bun', 'npm', 'brew'] as const as m}
					<button
						class="rounded-lg px-4 py-2 font-mono text-sm transition-colors
							{pkgMgr === m ? 'bg-base-300 text-primary' : 'text-base-content/40 hover:text-base-content/60'}"
						onclick={() => (pkgMgr = m)}>{m}</button
					>
				{/each}
			</div>
			<div class="mb-4">
				<CodeBlock label="install + init" lines={pkgCmds[pkgMgr]} />
			</div>
			<p class="text-sm text-base-content/60">
				Run <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">pk init</code> inside
				your project folder — not your home directory. It creates a knowledge folder at
				<code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs"
					>~/.pk/&lt;project&gt;/</code
				> and wires up your harness.
			</p>
		</div>
	</div>

	<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4">
		<p class="mb-3 font-mono text-xs tracking-widest text-base-content/30 uppercase">
			Non-interactive
		</p>
		<CodeBlock
			label="non-interactive"
			lines={['pk init my-project --harness claude', 'pk init my-project --harness claude,opencode']}
		/>
		<p class="mt-3 text-xs text-base-content/40">
			Available harnesses: <code class="font-mono">claude</code>,
			<code class="font-mono">opencode</code>, <code class="font-mono">pi</code>
		</p>
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
