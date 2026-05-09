<script lang="ts">
	type PkgMgr = 'curl' | 'bun' | 'npm' | 'brew';

	let pkgMgr = $state<PkgMgr>('curl');
	let copiedMap = $state<Record<string, boolean>>({});

	function copy(key: string, text: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedMap[key] = true;
			setTimeout(() => { copiedMap[key] = false; }, 2000);
		});
	}

	const pkgCmds: Record<PkgMgr, string[]> = {
		curl: ['curl -fsSL https://justestif.github.io/pk/install.sh | bash', 'pk init'],
		bun:  ['bun install -g @justestif/pk', 'pk init'],
		npm:  ['npm install -g @justestif/pk', 'pk init'],
		brew: ['brew install justEstif/tap/pk', 'pk init'],
	};

	const copyText: Record<PkgMgr, string> = {
		curl: 'curl -fsSL https://justestif.github.io/pk/install.sh | bash\npk init',
		bun:  'bun install -g @justestif/pk\npk init',
		npm:  'npm install -g @justestif/pk\npk init',
		brew: 'brew install justEstif/tap/pk\npk init',
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

	<!-- Prerequisites -->
	<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4">
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-3">Prerequisites</p>
		<div class="space-y-2">
			{#each [
				{ name: 'Git', note: 'tracks knowledge operations' },
				{ name: 'Bun', note: 'runtime and package manager' },
			] as req}
				<div class="flex items-center justify-between">
					<span class="font-mono text-sm text-base-content/70">{req.name}</span>
					<span class="font-mono text-xs text-base-content/30">{req.note}</span>
				</div>
			{/each}
		</div>
		<p class="font-mono text-xs text-primary/60 mt-3">The curl installer handles all of these automatically.</p>
	</div>

	<div class="card card-border bg-base-200">
		<div class="card-body">
			<h2 class="font-semibold text-lg mb-1">Install pk</h2>
			<p class="text-base-content/60 text-sm mb-4">Pick your install method:</p>
			<div class="flex gap-1 mb-3">
				{#each (['curl', 'bun', 'npm', 'brew'] as const) as m}
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
						onclick={() => copy('install', copyText[pkgMgr])}
					>{copiedMap['install'] ? 'copied!' : 'copy'}</button>
				</div>
				<div class="font-mono text-sm px-4 py-3 leading-loose">
					{#each pkgCmds[pkgMgr] as line}
						<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">{line}</span></div>
					{/each}
				</div>
			</div>
			<p class="text-base-content/60 text-sm">
				Run <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">pk init</code> inside your project folder — not your home directory. It creates a <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">.pk/</code> folder and wires up your harness.
			</p>
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

	<div class="pt-6 border-t border-base-300">
		<p class="text-base-content/40 text-sm">
			Something broken or unclear?
			<a href="https://github.com/justEstif/pk/issues/new" target="_blank" rel="noopener" class="link">Open a GitHub issue</a>
		</p>
	</div>

</div>
