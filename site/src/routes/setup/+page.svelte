<script lang="ts">
	import { base } from '$app/paths';

	type Path = 'unknown' | 'developer' | 'newcomer';
	type AITool = 'claude-code' | 'codex' | 'opencode';
	type OS = 'mac' | 'linux' | 'windows';
	type PkgMgr = 'npm' | 'bun' | 'brew';

	let path = $state<Path>('unknown');
	let aiTool = $state<AITool | null>(null);
	let os = $state<OS | null>(null);
	let pkgMgr = $state<PkgMgr>('bun');

	// Step completion tracking
	let doneGit = $state(false);
	let doneBun = $state(false);
	let donePk = $state(false);
	let doneHarness = $state(false);
	let doneInit = $state(false);

	// Copy state per command
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

	let allDone = $derived(
		path === 'developer' ? doneInit :
		path === 'newcomer' ? (doneGit && doneBun && donePk && doneHarness && doneInit) :
		false
	);
</script>

<svelte:head>
	<title>Get started — pk</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-8 pt-28 pb-24">

	<div class="mb-10">
		<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-3xl mb-3">Get started</h1>
		<p class="text-base-content/60 text-lg">Let's get pk running in your project. Takes about 5 minutes.</p>
	</div>

	{#if allDone}
		<!-- ── Success state ─────────────────────────────────────── -->
		<div class="card bg-base-200 card-border p-8 text-center">
			<div class="text-4xl mb-4">✓</div>
			<h2 class="text-2xl font-semibold mb-3">You're set up</h2>
			<p class="text-base-content/60 mb-6">
				pk is running. Your agent can now search your notes, log decisions, and answer questions about your project.
			</p>
			<a href="{base}/" class="btn bg-base-200 hover:bg-base-300 px-6 py-2.5 text-sm">Back to home</a>
		</div>

	{:else}

		<!-- ── Step 0: Which path? ───────────────────────────────── -->
		<div class="mb-8">
			<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-3">Step 1</div>
			<h2 class="text-xl font-semibold mb-1">Do you already use Claude Code, Codex, or OpenCode?</h2>
			<p class="text-base-content/60 text-sm mb-5">These are AI coding assistants that pk works with. If you're not sure, choose No.</p>
			<div class="flex gap-3 flex-wrap">
				<button
					class="btn px-6 py-2.5 text-sm {path === 'developer' ? 'btn-primary' : 'bg-base-200 hover:bg-base-300'}"
					onclick={() => { path = 'developer'; }}
				>Yes, I use one already</button>
				<button
					class="btn px-6 py-2.5 text-sm {path === 'newcomer' ? 'btn-primary' : 'bg-base-200 hover:bg-base-300'}"
					onclick={() => { path = 'newcomer'; }}
				>No, help me set up</button>
			</div>
		</div>

		<!-- ── Developer path ───────────────────────────────────── -->
		{#if path === 'developer'}
			<div class="space-y-8">

				<div class="card card-border bg-base-200">
					<div class="card-body">
						<h3 class="font-semibold text-lg mb-1">Install pk</h3>
						<p class="text-base-content/60 text-sm mb-4">pk is a CLI tool. Pick your package manager:</p>
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
								<span class="font-mono text-xs" style="color:#57534E">install</span>
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
							Run <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">pk init</code> inside your project folder — not in your home directory. It creates a <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">.pk/</code> folder where your notes live.
						</p>
						<label class="flex items-center gap-3 cursor-pointer">
							<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneInit} />
							<span class="text-sm">Done — pk is installed and initialized</span>
						</label>
					</div>
				</div>

			</div>

		<!-- ── Newcomer path ─────────────────────────────────────── -->
		{:else if path === 'newcomer'}
			<div class="space-y-8">

				<!-- Pick OS -->
				<div class="card card-border bg-base-200">
					<div class="card-body">
						<h3 class="font-semibold text-lg mb-1">What operating system are you on?</h3>
						<div class="flex gap-3 flex-wrap mt-3">
							{#each ([['mac', 'macOS'], ['linux', 'Linux'], ['windows', 'Windows']] as const) as [val, label]}
								<button
									class="btn px-6 py-2.5 text-sm {os === val ? 'btn-primary' : 'bg-base-300 hover:bg-base-300'}"
									onclick={() => (os = val)}
								>{label}</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Pick AI tool -->
				{#if os}
				<div class="card card-border bg-base-200">
					<div class="card-body">
						<h3 class="font-semibold text-lg mb-1">Which AI coding assistant do you want to use?</h3>
						<p class="text-base-content/60 text-sm mb-4">pk works with all three. Claude Code is the most popular choice right now.</p>
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

				<!-- Windows WSL warning -->
				{#if os === 'windows'}
				<div class="alert alert-warning">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/></svg>
					<div>
						<div class="font-semibold">Windows requires WSL</div>
						<div class="text-sm">Bun (and most AI CLI tools) don't run natively on Windows. You'll need WSL — Windows Subsystem for Linux. It takes about 10 minutes to set up.</div>
						<a href="https://learn.microsoft.com/en-us/windows/wsl/install" target="_blank" rel="noopener" class="link text-sm mt-1 block">Install WSL →</a>
					</div>
				</div>
				{/if}

				<!-- Steps only show after OS + AI tool picked -->
				{#if os && aiTool}

				<!-- Step: Install Git -->
				<div class="card card-border bg-base-200">
					<div class="card-body">
						<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 2</div>
						<h3 class="font-semibold text-lg mb-1">Install Git</h3>
						<p class="text-base-content/60 text-sm mb-4">
							Git is how pk tracks your notes over time. It's the most widely used version control tool — you may already have it.
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
							<p class="text-base-content/60 text-sm mb-3">If it's not installed, macOS will prompt you to install Xcode Command Line Tools — just click Install.</p>
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

				<!-- Step: Install Bun -->
				{#if doneGit}
				<div class="card card-border bg-base-200">
					<div class="card-body">
						<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 3</div>
						<h3 class="font-semibold text-lg mb-1">Install Bun</h3>
						<p class="text-base-content/60 text-sm mb-4">
							Bun is a fast JavaScript runtime — think of it like Node.js but faster. pk is distributed through it.
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
						<p class="text-base-content/60 text-sm mb-4">After installing, close and reopen your terminal so Bun is available in your PATH.</p>
						<label class="flex items-center gap-3 cursor-pointer">
							<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneBun} />
							<span class="text-sm">Done — <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">bun --version</code> shows a version number</span>
						</label>
					</div>
				</div>
				{/if}

				<!-- Step: Install pk -->
				{#if doneGit && doneBun}
				<div class="card card-border bg-base-200">
					<div class="card-body">
						<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 4</div>
						<h3 class="font-semibold text-lg mb-1">Install pk</h3>
						<p class="text-base-content/60 text-sm mb-4">
							pk is the CLI that your AI agent uses to read and write your project notes.
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

				<!-- Step: Set up AI harness -->
				{#if doneGit && doneBun && donePk}
				<div class="card card-border bg-base-200">
					<div class="card-body">
						<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 5</div>
						<h3 class="font-semibold text-lg mb-1">Install {harnessInstall[aiTool].label}</h3>
						<p class="text-base-content/60 text-sm mb-4">
							This is the AI assistant that will use pk to answer your questions. You'll chat with it in your terminal, inside your project.
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

				<!-- Step: pk init -->
				{#if doneGit && doneBun && donePk && doneHarness}
				<div class="card card-border bg-base-200">
					<div class="card-body">
						<div class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-1">Step 6</div>
						<h3 class="font-semibold text-lg mb-1">Initialize pk in your project</h3>
						<p class="text-base-content/60 text-sm mb-4">
							Navigate to the project folder you want to use pk with, then run <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">pk init</code>. This creates a <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">.pk/</code> folder where your notes will live.
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
			</div>
		{/if}

	{/if}

	<!-- Feedback -->
	<div class="mt-16 pt-8 border-t border-base-300">
		<p class="text-base-content/40 text-sm">
			Something broken or unclear?
			<a href="https://github.com/justEstif/pk/issues/new" target="_blank" rel="noopener" class="link">Open a GitHub issue</a>
		</p>
	</div>

</div>
