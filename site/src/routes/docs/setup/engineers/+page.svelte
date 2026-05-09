<script lang="ts">
	type PkgMgr = 'npm' | 'bun' | 'brew';

	let pkgMgr = $state<PkgMgr>('bun');
	let doneInit = $state(false);
	let copiedMap = $state<Record<string, boolean>>({});

	function copy(key: string, text: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedMap[key] = true;
			setTimeout(() => { copiedMap[key] = false; }, 2000);
		});
	}

	const pkgCmds: Record<PkgMgr, string> = {
		npm: 'npm install -g @justestif/pk',
		bun: 'bun install -g @justestif/pk',
		brew: 'brew install justEstif/tap/pk'
	};
</script>

<svelte:head>
	<title>Quick setup — pk</title>
</svelte:head>

<div class="space-y-10">

	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-3xl mb-2">Quick setup</h1>
		<p class="text-base-content/60 text-lg">Already using Claude Code, Codex, or OpenCode? Two commands.</p>
	</div>

	{#if doneInit}
		<div class="card bg-base-200 card-border p-8 text-center">
			<div class="text-3xl mb-3">✓</div>
			<h2 class="text-xl font-semibold mb-2">You're set up</h2>
			<p class="text-base-content/60 text-sm">pk is running. Your agent can now search notes, log decisions, and answer questions about your project.</p>
		</div>
	{:else}

		<div class="card card-border bg-base-200">
			<div class="card-body">
				<h2 class="font-semibold text-lg mb-1">Install pk</h2>
				<p class="text-base-content/60 text-sm mb-4">Pick your package manager:</p>
				<div class="flex gap-1 mb-3">
					{#each (['bun', 'npm', 'brew'] as const) as m}
						<button
							class="font-mono text-sm px-4 py-2 rounded-lg transition-colors
								{pkgMgr === m ? 'bg-base-300 text-primary' : 'text-base-content/40 hover:text-base-content/60'}"
							onclick={() => (pkgMgr = m)}
						>{m}</button>
					{/each}
				</div>
				<div class="rounded-lg overflow-hidden mb-4" style="background:#1C1917">
					<div class="flex items-center justify-between px-4 py-2" style="border-bottom:1px solid #292524">
						<span class="font-mono text-xs" style="color:#57534E">install + init</span>
						<button
							class="font-mono text-xs transition-colors {copiedMap['install'] ? 'text-success' : 'text-base-content/40 hover:text-base-content/60'}"
							onclick={() => copy('install', pkgCmds[pkgMgr] + '\npk init')}
						>{copiedMap['install'] ? 'copied!' : 'copy'}</button>
					</div>
					<div class="font-mono text-sm px-4 py-3 leading-loose">
						<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">{pkgCmds[pkgMgr]}</span></div>
						<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk init</span></div>
					</div>
				</div>
				<p class="text-base-content/60 text-sm mb-4">
					Run <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">pk init</code> inside your project folder — not your home directory. It creates a <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">.pk/</code> folder and wires up your harness.
				</p>
				<label class="flex items-center gap-3 cursor-pointer">
					<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneInit} />
					<span class="text-sm">Done — pk is installed and initialized</span>
				</label>
			</div>
		</div>

		<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4">
			<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-3">Non-interactive</p>
			<div class="rounded-lg overflow-hidden" style="background:#1C1917">
				<div class="font-mono text-sm px-4 py-3 leading-loose">
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk init my-project --harness claude</span></div>
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk init my-project --harness claude,codex</span></div>
				</div>
			</div>
			<p class="text-base-content/40 text-xs mt-3">Available harnesses: <code class="font-mono">claude</code>, <code class="font-mono">codex</code>, <code class="font-mono">opencode</code></p>
		</div>

	{/if}

	<div class="pt-6 border-t border-base-300">
		<p class="text-base-content/40 text-sm">
			Something broken or unclear?
			<a href="https://github.com/justEstif/pk/issues/new" target="_blank" rel="noopener" class="link">Open a GitHub issue</a>
		</p>
	</div>

</div>
