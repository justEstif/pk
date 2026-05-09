<script lang="ts">
	type AITool = 'claude-code' | 'codex' | 'opencode';
	type OS = 'mac' | 'linux' | 'windows';

	let aiTool = $state<AITool | null>(null);
	let os = $state<OS | null>(null);
	let doneGit = $state(false);
	let doneBun = $state(false);
	let donePk = $state(false);
	let doneHarness = $state(false);
	let doneInit = $state(false);
	let copiedMap = $state<Record<string, boolean>>({});

	function copy(key: string, text: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedMap[key] = true;
			setTimeout(() => { copiedMap[key] = false; }, 2000);
		});
	}

	const harnessInstall: Record<AITool, { label: string; cmd: string | null; platformCmds?: Partial<Record<OS, string>>; note?: string; docs: string }> = {
		'claude-code': {
			label: 'Claude Code',
			cmd: null,
			platformCmds: {
				mac:     'curl -fsSL https://claude.ai/install.sh | bash',
				linux:   'curl -fsSL https://claude.ai/install.sh | bash',
				windows: 'irm https://claude.ai/install.ps1 | iex'
			},
			note: 'Then run `claude` to log in on first use.',
			docs: 'https://code.claude.com/docs/en/quickstart'
		},
		codex: {
			label: 'Codex CLI',
			cmd: 'npm install -g @openai/codex',
			docs: 'https://github.com/openai/codex'
		},
		opencode: {
			label: 'OpenCode',
			cmd: 'npm install -g opencode-ai',
			docs: 'https://opencode.ai'
		}
	};

	let allDone = $derived(doneGit && doneBun && donePk && doneHarness && doneInit);
</script>

<svelte:head>
	<title>Step-by-step setup — pk</title>
</svelte:head>

<div class="space-y-8">

	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-3xl mb-2">Step-by-step setup</h1>
		<p class="text-base-content/60 text-lg">New to AI coding tools? We'll get everything installed together. Takes about 10 minutes.</p>
	</div>

	{#if allDone}
		<div class="card bg-base-200 card-border p-8 text-center">
			<div class="text-3xl mb-3">✓</div>
			<h2 class="text-xl font-semibold mb-2">You're set up</h2>
			<p class="text-base-content/60 text-sm">pk is running. Your agent can now search notes, log decisions, and answer questions about your project.</p>
		</div>
	{:else}

	<!-- Step 1: OS -->
	<div class="card card-border bg-base-200">
		<div class="card-body">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 1</div>
			<h2 class="font-semibold text-lg mb-3">What operating system are you on?</h2>
			<div class="flex gap-3 flex-wrap">
				{#each ([['mac', 'macOS'], ['linux', 'Linux'], ['windows', 'Windows']] as const) as [val, label]}
					<button
						class="btn px-6 py-2.5 text-sm {os === val ? 'btn-primary' : 'bg-base-300 hover:bg-base-300'}"
						onclick={() => (os = val)}
					>{label}</button>
				{/each}
			</div>
		</div>
	</div>

	{#if os === 'windows'}
	<div class="alert alert-warning">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/></svg>
		<div>
			<div class="font-semibold">Windows requires WSL</div>
			<div class="text-sm">Bun and most AI CLI tools don't run natively on Windows. You'll need WSL — Windows Subsystem for Linux. It takes about 10 minutes to set up.</div>
			<a href="https://learn.microsoft.com/en-us/windows/wsl/install" target="_blank" rel="noopener" class="link text-sm mt-1 block">Install WSL →</a>
		</div>
	</div>
	{/if}

	<!-- Step 2: AI tool -->
	{#if os}
	<div class="card card-border bg-base-200">
		<div class="card-body">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 2</div>
			<h2 class="font-semibold text-lg mb-1">Which AI assistant do you want to use?</h2>
			<p class="text-base-content/60 text-sm mb-4">pk works with all three. Claude Code is the most popular right now.</p>
			<div class="flex gap-3 flex-wrap">
				{#each ([['claude-code', 'Claude Code'], ['codex', 'Codex'], ['opencode', 'OpenCode']] as const) as [val, label]}
					<button
						class="btn px-6 py-2.5 text-sm {aiTool === val ? 'btn-primary' : 'bg-base-300 hover:bg-base-300'}"
						onclick={() => (aiTool = val)}
					>{label}</button>
				{/each}
			</div>
		</div>
	</div>
	{/if}

	{#if os && aiTool}

	<!-- Step 3: Git -->
	<div class="card card-border bg-base-200">
		<div class="card-body">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 3</div>
			<h2 class="font-semibold text-lg mb-1">Install Git</h2>
			<p class="text-base-content/60 text-sm mb-4">
				Git is how pk tracks your notes over time. You may already have it — check first.
			</p>
			<div class="rounded-lg overflow-hidden mb-4" style="background:#1C1917">
				<div class="flex items-center justify-between px-4 py-2" style="border-bottom:1px solid #292524">
					<span class="font-mono text-xs" style="color:#57534E">check if installed</span>
					<button class="font-mono text-xs {copiedMap['git-check'] ? 'text-success' : 'text-base-content/40'}" onclick={() => copy('git-check', 'git --version')}>{copiedMap['git-check'] ? 'copied!' : 'copy'}</button>
				</div>
				<div class="font-mono text-sm px-4 py-3">
					<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">git --version</span>
				</div>
			</div>
			{#if os === 'mac'}
				<p class="text-base-content/60 text-sm mb-3">If not installed, macOS will prompt you to install Xcode Command Line Tools — just click Install.</p>
			{:else if os === 'linux'}
				<div class="rounded-lg overflow-hidden mb-3" style="background:#1C1917">
					<div class="font-mono text-sm px-4 py-3">
						<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">sudo apt-get install git</span>
						<span style="color:#44403C; display:block; margin-top:4px"># or: sudo dnf install git</span>
					</div>
				</div>
			{:else}
				<p class="text-base-content/60 text-sm mb-3">Inside WSL, run: <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">sudo apt-get install git</code></p>
			{/if}
			<label class="flex items-center gap-3 cursor-pointer">
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneGit} />
				<span class="text-sm">Done — <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">git --version</code> shows a version number</span>
			</label>
		</div>
	</div>

	<!-- Step 4: Bun -->
	{#if doneGit}
	<div class="card card-border bg-base-200">
		<div class="card-body">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 4</div>
			<h2 class="font-semibold text-lg mb-1">Install Bun</h2>
			<p class="text-base-content/60 text-sm mb-4">
				Bun is a JavaScript runtime — like Node.js but faster. pk is distributed through it.
			</p>
			<div class="rounded-lg overflow-hidden mb-4" style="background:#1C1917">
				<div class="flex items-center justify-between px-4 py-2" style="border-bottom:1px solid #292524">
					<span class="font-mono text-xs" style="color:#57534E">install bun</span>
					<button class="font-mono text-xs {copiedMap['bun'] ? 'text-success' : 'text-base-content/40'}" onclick={() => copy('bun', 'curl -fsSL https://bun.sh/install | bash')}>{copiedMap['bun'] ? 'copied!' : 'copy'}</button>
				</div>
				<div class="font-mono text-sm px-4 py-3">
					<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">curl -fsSL https://bun.sh/install | bash</span>
				</div>
			</div>
			<p class="text-base-content/60 text-sm mb-4">After installing, close and reopen your terminal so Bun is on your PATH.</p>
			<label class="flex items-center gap-3 cursor-pointer">
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneBun} />
				<span class="text-sm">Done — <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">bun --version</code> shows a version number</span>
			</label>
		</div>
	</div>
	{/if}

	<!-- Step 5: pk -->
	{#if doneGit && doneBun}
	<div class="card card-border bg-base-200">
		<div class="card-body">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 5</div>
			<h2 class="font-semibold text-lg mb-1">Install pk</h2>
			<p class="text-base-content/60 text-sm mb-4">
				pk is the CLI your AI agent uses to read and write project notes.
			</p>
			<div class="rounded-lg overflow-hidden mb-4" style="background:#1C1917">
				<div class="flex items-center justify-between px-4 py-2" style="border-bottom:1px solid #292524">
					<span class="font-mono text-xs" style="color:#57534E">install pk</span>
					<button class="font-mono text-xs {copiedMap['pk'] ? 'text-success' : 'text-base-content/40'}" onclick={() => copy('pk', 'bun install -g @justestif/pk')}>{copiedMap['pk'] ? 'copied!' : 'copy'}</button>
				</div>
				<div class="font-mono text-sm px-4 py-3">
					<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">bun install -g @justestif/pk</span>
				</div>
			</div>
			<label class="flex items-center gap-3 cursor-pointer">
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={donePk} />
				<span class="text-sm">Done — <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">pk --version</code> shows a version number</span>
			</label>
		</div>
	</div>
	{/if}

	<!-- Step 6: AI harness -->
	{#if doneGit && doneBun && donePk}
	<div class="card card-border bg-base-200">
		<div class="card-body">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 6</div>
			<h2 class="font-semibold text-lg mb-1">Install {harnessInstall[aiTool].label}</h2>
			<p class="text-base-content/60 text-sm mb-4">
				This is the AI assistant pk will work alongside. You'll chat with it in your terminal.
			</p>
			<div class="rounded-lg overflow-hidden mb-4" style="background:#1C1917">
				<div class="flex items-center justify-between px-4 py-2" style="border-bottom:1px solid #292524">
					<span class="font-mono text-xs" style="color:#57534E">install {harnessInstall[aiTool].label.toLowerCase()}</span>
					<button class="font-mono text-xs {copiedMap['harness'] ? 'text-success' : 'text-base-content/40'}"
						onclick={() => copy('harness', harnessInstall[aiTool].cmd ?? harnessInstall[aiTool].platformCmds?.[os!] ?? '')}
					>{copiedMap['harness'] ? 'copied!' : 'copy'}</button>
				</div>
				<div class="font-mono text-sm px-4 py-3">
					{#if os === 'windows' && aiTool === 'claude-code'}
						<div class="font-mono text-xs mb-2" style="color:#57534E">PowerShell:</div>
						<div><span style="color:#44403C" class="mr-3">></span><span style="color:#A8A29E">irm https://claude.ai/install.ps1 | iex</span></div>
					{:else}
						<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">{harnessInstall[aiTool].cmd ?? harnessInstall[aiTool].platformCmds?.[os!] ?? ''}</span></div>
					{/if}
				</div>
			</div>
			{#if harnessInstall[aiTool].note}
				<p class="text-base-content/60 text-sm mb-3">{harnessInstall[aiTool].note}</p>
			{/if}
			<a href={harnessInstall[aiTool].docs} target="_blank" rel="noopener" class="link text-sm text-base-content/50 mb-4 block">{harnessInstall[aiTool].label} docs →</a>
			<label class="flex items-center gap-3 cursor-pointer">
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneHarness} />
				<span class="text-sm">Done — {harnessInstall[aiTool].label} is installed and authenticated</span>
			</label>
		</div>
	</div>
	{/if}

	<!-- Step 7: pk init -->
	{#if doneGit && doneBun && donePk && doneHarness}
	<div class="card card-border bg-base-200">
		<div class="card-body">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 7</div>
			<h2 class="font-semibold text-lg mb-1">Initialize pk in your project</h2>
			<p class="text-base-content/60 text-sm mb-4">
				Open your terminal, navigate to your project folder, and run <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">pk init</code>. This creates a <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">.pk/</code> folder where your notes will live.
			</p>
			<div class="rounded-lg overflow-hidden mb-4" style="background:#1C1917">
				<div class="flex items-center justify-between px-4 py-2" style="border-bottom:1px solid #292524">
					<span class="font-mono text-xs" style="color:#57534E">initialize</span>
					<button class="font-mono text-xs {copiedMap['init'] ? 'text-success' : 'text-base-content/40'}" onclick={() => copy('init', 'cd your-project\npk init')}>{copiedMap['init'] ? 'copied!' : 'copy'}</button>
				</div>
				<div class="font-mono text-sm px-4 py-3 leading-loose">
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">cd your-project</span></div>
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk init</span></div>
				</div>
			</div>
			<label class="flex items-center gap-3 cursor-pointer">
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneInit} />
				<span class="text-sm">Done — pk initialized successfully</span>
			</label>
		</div>
	</div>
	{/if}

	{/if}
	{/if}

	<div class="pt-6 border-t border-base-300">
		<p class="text-base-content/40 text-sm">
			Something broken or unclear?
			<a href="https://github.com/justEstif/pk/issues/new" target="_blank" rel="noopener" class="link">Open a GitHub issue</a>
		</p>
	</div>

</div>
