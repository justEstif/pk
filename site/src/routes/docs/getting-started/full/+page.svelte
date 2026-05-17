<script lang="ts">
	type AITool = 'opencode' | 'pi';
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
			setTimeout(() => {
				copiedMap[key] = false;
			}, 2000);
		});
	}

	function harnessCommand(tool: AITool, selectedOs: OS | null): string {
		const install = harnessInstall[tool];
		if (install.cmd) return install.cmd;
		return selectedOs ? (install.platformCmds?.[selectedOs] ?? '') : '';
	}

	const harnessInstall: Record<
		AITool,
		{
			label: string;
			cmd: string | null;
			platformCmds?: Partial<Record<OS, string>>;
			note?: string;
			docs: string;
		}
	> = {
		opencode: {
			label: 'OpenCode',
			cmd: 'npm install -g opencode-ai',
			docs: 'https://opencode.ai'
		},
		pi: {
			label: 'Pi',
			cmd: 'npm install -g @earendil-works/pi-coding-agent',
			docs: 'https://pi.dev'
		}

	};

	let allDone = $derived(doneGit && doneBun && donePk && doneHarness && doneInit);
</script>

<svelte:head>
	<title>Step-by-step setup — pk</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">
			Step-by-step setup
		</h1>
		<p class="text-lg text-base-content/60">
			New to AI coding tools? We'll get everything installed together. Takes about 10 minutes.
		</p>
	</div>

	<!-- Shortcut callout -->
	<div class="card border-l-4 border-l-primary bg-base-200 card-border">
		<div class="card-body gap-3">
			<p class="font-mono text-xs tracking-widest text-primary uppercase">
				Shortcut — macOS / Linux
			</p>
			<p class="text-sm leading-relaxed text-base-content/70">
				One command installs Git, Bun, and pk for you — skipping steps 3–5. You'll still need to
				install your AI tool and run <code
					class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">pk init</code
				>.
			</p>
			<div class="overflow-hidden rounded-lg" style="background:#1C1917">
				<div class="px-4 py-3 font-mono text-sm">
					<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E"
						>curl -fsSL https://justestif.github.io/pk/install.sh | bash</span
					>
				</div>
			</div>
		</div>
	</div>

	{#if allDone}
		<div class="card bg-base-200 p-8 text-center card-border">
			<div class="mb-3 text-3xl">✓</div>
			<h2 class="mb-2 text-xl font-semibold">You're set up</h2>
			<p class="text-sm text-base-content/60">
				pk is running. Your agent can now search notes, log decisions, and answer questions about
				your project.
			</p>
		</div>
	{:else}
		<!-- Step 1: OS -->
		<div class="card bg-base-200 card-border">
			<div class="card-body">
				<div class="mb-1 font-mono text-xs tracking-widest text-base-content/30 uppercase">
					Step 1
				</div>
				<h2 class="mb-3 text-lg font-semibold">What operating system are you on?</h2>
				<div class="flex flex-wrap gap-3">
					{#each [['mac', 'macOS'], ['linux', 'Linux'], ['windows', 'Windows']] as const as [val, label]}
						<button
							class="btn px-6 py-2.5 text-sm {os === val
								? 'btn-primary'
								: 'bg-base-300 hover:bg-base-300'}"
							onclick={() => (os = val)}>{label}</button
						>
					{/each}
				</div>
			</div>
		</div>

		{#if os === 'windows'}
			<div class="alert alert-warning">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5 shrink-0"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"
					/></svg
				>
				<div>
					<div class="font-semibold">Windows requires WSL</div>
					<div class="text-sm">
						Bun and most AI CLI tools don't run natively on Windows. You'll need WSL — Windows
						Subsystem for Linux. It takes about 10 minutes to set up.
					</div>
					<a
						href="https://learn.microsoft.com/en-us/windows/wsl/install"
						target="_blank"
						rel="noopener"
						class="mt-1 block link text-sm">Install WSL →</a
					>
				</div>
			</div>
		{/if}

		<!-- Step 2: AI tool -->
		{#if os}
			<div class="card bg-base-200 card-border">
				<div class="card-body">
					<div class="mb-1 font-mono text-xs tracking-widest text-base-content/30 uppercase">
						Step 2
					</div>
					<h2 class="mb-1 text-lg font-semibold">Which AI assistant do you want to use?</h2>
					<p class="mb-4 text-sm text-base-content/60">
						pk works with all of these. OpenCode and Pi both work as terminal-based coding agents.
					</p>
					<div class="flex flex-wrap gap-3">
						{#each [['opencode', 'OpenCode'], ['pi', 'Pi']] as const as [val, label]}
							<button
								class="btn px-6 py-2.5 text-sm {aiTool === val
									? 'btn-primary'
									: 'bg-base-300 hover:bg-base-300'}"
								onclick={() => (aiTool = val)}>{label}</button
							>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		{#if os && aiTool}
			<!-- Step 3: Git -->
			<div class="card bg-base-200 card-border">
				<div class="card-body">
					<div class="mb-1 font-mono text-xs tracking-widest text-base-content/30 uppercase">
						Step 3
					</div>
					<h2 class="mb-1 text-lg font-semibold">Install Git</h2>
					<p class="mb-4 text-sm text-base-content/60">
						Git is how pk tracks your notes over time. You may already have it — check first.
					</p>
					<div class="mb-4 overflow-hidden rounded-lg" style="background:#1C1917">
						<div
							class="flex items-center justify-between px-4 py-2"
							style="border-bottom:1px solid #292524"
						>
							<span class="font-mono text-xs" style="color:#57534E">check if installed</span>
							<button
								class="font-mono text-xs {copiedMap['git-check']
									? 'text-success'
									: 'text-base-content/40'}"
								onclick={() => copy('git-check', 'git --version')}
								>{copiedMap['git-check'] ? 'copied!' : 'copy'}</button
							>
						</div>
						<div class="px-4 py-3 font-mono text-sm">
							<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E"
								>git --version</span
							>
						</div>
					</div>
					{#if os === 'mac'}
						<p class="mb-3 text-sm text-base-content/60">
							If not installed, macOS will prompt you to install Xcode Command Line Tools — just
							click Install.
						</p>
					{:else if os === 'linux'}
						<div class="mb-3 overflow-hidden rounded-lg" style="background:#1C1917">
							<div class="px-4 py-3 font-mono text-sm">
								<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E"
									>sudo apt-get install git</span
								>
								<span style="color:#44403C; display:block; margin-top:4px"
									># or: sudo dnf install git</span
								>
							</div>
						</div>
					{:else}
						<p class="mb-3 text-sm text-base-content/60">
							Inside WSL, run: <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs"
								>sudo apt-get install git</code
							>
						</p>
					{/if}
					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneGit} />
						<span class="text-sm"
							>Done — <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs"
								>git --version</code
							> shows a version number</span
						>
					</label>
				</div>
			</div>

			<!-- Step 4: Bun -->
			{#if doneGit}
				<div class="card bg-base-200 card-border">
					<div class="card-body">
						<div class="mb-1 font-mono text-xs tracking-widest text-base-content/30 uppercase">
							Step 4
						</div>
						<h2 class="mb-1 text-lg font-semibold">Install Bun</h2>
						<p class="mb-4 text-sm text-base-content/60">
							Bun is a JavaScript runtime — like Node.js but faster. pk is distributed through it.
						</p>
						<div class="mb-4 overflow-hidden rounded-lg" style="background:#1C1917">
							<div
								class="flex items-center justify-between px-4 py-2"
								style="border-bottom:1px solid #292524"
							>
								<span class="font-mono text-xs" style="color:#57534E">install bun</span>
								<button
									class="font-mono text-xs {copiedMap['bun']
										? 'text-success'
										: 'text-base-content/40'}"
									onclick={() => copy('bun', 'curl -fsSL https://bun.sh/install | bash')}
									>{copiedMap['bun'] ? 'copied!' : 'copy'}</button
								>
							</div>
							<div class="px-4 py-3 font-mono text-sm">
								<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E"
									>curl -fsSL https://bun.sh/install | bash</span
								>
							</div>
						</div>
						<p class="mb-4 text-sm text-base-content/60">
							After installing, close and reopen your terminal so Bun is on your PATH.
						</p>
						<label class="flex cursor-pointer items-center gap-3">
							<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneBun} />
							<span class="text-sm"
								>Done — <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs"
									>bun --version</code
								> shows a version number</span
							>
						</label>
					</div>
				</div>
			{/if}

			<!-- Step 5: pk -->
			{#if doneGit && doneBun}
				<div class="card bg-base-200 card-border">
					<div class="card-body">
						<div class="mb-1 font-mono text-xs tracking-widest text-base-content/30 uppercase">
							Step 5
						</div>
						<h2 class="mb-1 text-lg font-semibold">Install pk</h2>
						<p class="mb-4 text-sm text-base-content/60">
							pk is the CLI your AI agent uses to read and write project notes.
						</p>
						<div class="mb-4 overflow-hidden rounded-lg" style="background:#1C1917">
							<div
								class="flex items-center justify-between px-4 py-2"
								style="border-bottom:1px solid #292524"
							>
								<span class="font-mono text-xs" style="color:#57534E">install pk</span>
								<button
									class="font-mono text-xs {copiedMap['pk']
										? 'text-success'
										: 'text-base-content/40'}"
									onclick={() => copy('pk', 'bun install -g @justestif/pk')}
									>{copiedMap['pk'] ? 'copied!' : 'copy'}</button
								>
							</div>
							<div class="px-4 py-3 font-mono text-sm">
								<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E"
									>bun install -g @justestif/pk</span
								>
							</div>
						</div>
						<label class="flex cursor-pointer items-center gap-3">
							<input type="checkbox" class="checkbox checkbox-primary" bind:checked={donePk} />
							<span class="text-sm"
								>Done — <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs"
									>pk --version</code
								> shows a version number</span
							>
						</label>
					</div>
				</div>
			{/if}

			<!-- Step 6: AI harness -->
			{#if doneGit && doneBun && donePk && aiTool}
				{@const selectedTool = aiTool}
				<div class="card bg-base-200 card-border">
					<div class="card-body">
						<div class="mb-1 font-mono text-xs tracking-widest text-base-content/30 uppercase">
							Step 6
						</div>
					<h2 class="mb-1 text-lg font-semibold">Install {harnessInstall[selectedTool].label}</h2>
						<p class="mb-4 text-sm text-base-content/60">
							This is the AI assistant pk will work alongside. You'll chat with it in your terminal.
						</p>
						<div class="mb-4 overflow-hidden rounded-lg" style="background:#1C1917">
							<div
								class="flex items-center justify-between px-4 py-2"
								style="border-bottom:1px solid #292524"
							>
								<span class="font-mono text-xs" style="color:#57534E"
									>install {harnessInstall[selectedTool].label.toLowerCase()}</span
								>
								<button
									class="font-mono text-xs {copiedMap['harness']
										? 'text-success'
										: 'text-base-content/40'}"
									onclick={() => copy('harness', harnessCommand(selectedTool, os))}
									>{copiedMap['harness'] ? 'copied!' : 'copy'}</button
								>
							</div>
							<div class="px-4 py-3 font-mono text-sm">
								<div>
									<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E"
										>{harnessCommand(selectedTool, os)}</span
									>
								</div>
							</div>
						</div>
						{#if harnessInstall[selectedTool].note}
							<p class="mb-3 text-sm text-base-content/60">{harnessInstall[selectedTool].note}</p>
						{/if}
						<a
							href={harnessInstall[selectedTool].docs}
							target="_blank"
							rel="noopener"
							class="mb-4 block link text-sm text-base-content/50"
							>{harnessInstall[aiTool].label} docs →</a
						>
						<label class="flex cursor-pointer items-center gap-3">
							<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneHarness} />
							<span class="text-sm"
								>Done — {harnessInstall[aiTool].label} is installed and authenticated</span
							>
						</label>
					</div>
				</div>
			{/if}

			<!-- Step 7: pk init -->
			{#if doneGit && doneBun && donePk && doneHarness}
				<div class="card bg-base-200 card-border">
					<div class="card-body">
						<div class="mb-1 font-mono text-xs tracking-widest text-base-content/30 uppercase">
							Step 7
						</div>
						<h2 class="mb-1 text-lg font-semibold">Initialize pk in your project</h2>
						<p class="mb-4 text-sm text-base-content/60">
							Open your terminal, navigate to your project folder, and run <code
								class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">pk init</code
							>. By default this creates the knowledge store at
							<code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">.pk/</code>
							inside your project, writes
							<code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">.pk/config.json</code>
							so pk commands find it automatically, adds <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">.pk/</code> to
							<code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">.gitignore</code>, and wires up your AI tool.
							Use <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">--global</code> to store in <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">~/.pk/&lt;name&gt;/</code> instead.
						</p>
						<div class="mb-4 overflow-hidden rounded-lg" style="background:#1C1917">
							<div
								class="flex items-center justify-between px-4 py-2"
								style="border-bottom:1px solid #292524"
							>
								<span class="font-mono text-xs" style="color:#57534E">initialize</span>
								<button
									class="font-mono text-xs {copiedMap['init']
										? 'text-success'
										: 'text-base-content/40'}"
									onclick={() => copy('init', 'cd your-project\npk init')}
									>{copiedMap['init'] ? 'copied!' : 'copy'}</button
								>
							</div>
							<div class="px-4 py-3 font-mono text-sm leading-loose">
								<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">cd your-project</span></div>
								<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk init</span></div>
							</div>
						</div>
						<label class="flex cursor-pointer items-center gap-3">
							<input type="checkbox" class="checkbox checkbox-primary" bind:checked={doneInit} />
							<span class="text-sm">Done — pk initialized successfully</span>
						</label>
					</div>
				</div>
			{/if}
		{/if}
	{/if}

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
