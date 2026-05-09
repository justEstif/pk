<svelte:head>
	<title>Design system — pk</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-16 space-y-14">

	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-5xl mb-3">
			pk <span class="text-primary">design system</span>
		</h1>
		<p class="text-base-content/60 text-lg">Bear warmth · Linear precision</p>
	</div>

	<div class="divider"></div>

	<!-- Colors -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Color tokens</p>
		<div class="flex flex-wrap gap-4">
			{#each [
				['bg-base-100 border border-base-300', 'base-100'],
				['bg-base-200 border border-base-300', 'base-200'],
				['bg-base-300 border border-base-300', 'base-300'],
				['bg-primary', 'primary'],
				['bg-base-content', 'content'],
				['bg-base-content/30', 'muted'],
			] as [cls, label]}
				<div class="flex flex-col items-center gap-1">
					<div class="w-16 h-16 rounded-xl {cls}"></div>
					<span class="font-mono text-[10px] text-base-content/40">{label}</span>
				</div>
			{/each}
		</div>
	</section>

	<div class="divider"></div>

	<!-- Typography -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Typography</p>
		<div class="space-y-6">
			<div>
				<p class="font-mono text-xs text-base-content/30 mb-1">display — Unbounded 900</p>
				<p style="font-family:'Unbounded',sans-serif" class="font-black text-5xl">pk</p>
			</div>
			<div>
				<p class="font-mono text-xs text-base-content/30 mb-1">h1 — DM Sans 600</p>
				<p class="text-3xl font-semibold">Structured bookkeeping for every project.</p>
			</div>
			<div>
				<p class="font-mono text-xs text-base-content/30 mb-1">h2 — DM Sans 600</p>
				<p class="text-2xl font-semibold">Get started in two steps</p>
			</div>
			<div>
				<p class="font-mono text-xs text-base-content/30 mb-1">body — DM Sans 400</p>
				<p class="text-base text-base-content/60 max-w-prose leading-relaxed">
					Drop in information as you work — a decision, a Slack thread, a doc, a question you haven't answered yet.
				</p>
			</div>
			<div>
				<p class="font-mono text-xs text-base-content/30 mb-1">mono — JetBrains Mono</p>
				<p class="font-mono text-sm text-base-content/60">npm install -g @justestif/pk && pk init</p>
			</div>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Buttons -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Buttons</p>
		<div class="flex flex-wrap gap-3 items-center">
			<button class="btn btn-primary px-8 py-3 text-base">Get started</button>
			<button class="btn bg-base-200 hover:bg-base-300 px-6 py-2.5 text-sm text-base-content/60">View on GitHub</button>
			<button class="btn bg-base-200 hover:bg-base-300 px-6 py-2.5 text-sm text-base-content/60">npm</button>
			<button class="btn btn-ghost btn-sm px-3 text-xs text-base-content/40">copy</button>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Badges -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Badges</p>
		<div class="flex flex-wrap gap-2 items-center">
			<span class="badge badge-warning badge-soft font-mono">decision</span>
			<span class="badge badge-success badge-soft font-mono">resolved</span>
			<span class="badge badge-error badge-soft font-mono">open</span>
			<span class="badge badge-info badge-soft font-mono">source</span>
			<span class="badge badge-ghost font-mono border border-base-300">note</span>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Cards -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Cards</p>
		<div class="space-y-3">
			<div class="card card-border bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Default card</h2>
					<p class="text-base-content/60">Used for feature sections, info blocks, and general content grouping.</p>
				</div>
			</div>
			<div class="card bg-primary text-primary-content">
				<div class="card-body">
					<h2 class="card-title">Highlighted card</h2>
					<p class="opacity-80">For the most important action or callout on the page.</p>
				</div>
			</div>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Install widget -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Install widget</p>
		<div class="rounded-xl overflow-hidden border border-base-300 border-l-4 border-l-primary">
			<div class="flex items-center bg-base-200 border-b border-base-300">
				<button class="font-mono text-sm px-5 py-3 border-r border-base-300 bg-base-300 text-primary">npm</button>
				<button class="font-mono text-sm px-5 py-3 border-r border-base-300 text-base-content/30">bun</button>
				<button class="font-mono text-sm px-5 py-3 text-base-content/30">brew</button>
				<div class="flex-1"></div>
				<button class="btn btn-ghost btn-sm px-3 font-mono text-xs text-base-content/40">copy</button>
			</div>
			<div class="font-mono text-sm px-5 py-4 leading-loose" style="background:#1C1917">
				<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">npm install -g @justestif/pk</span></div>
				<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk init</span></div>
			</div>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Terminal demo -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Terminal demo</p>
		<div class="rounded-xl overflow-hidden" style="background:#1C1917">
			<div style="background:#292524; padding:10px 16px; display:flex; align-items:center; gap:6px">
				<span style="width:10px;height:10px;border-radius:50%;background:#FF5F57;display:inline-block"></span>
				<span style="width:10px;height:10px;border-radius:50%;background:#FEBC2E;display:inline-block"></span>
				<span style="width:10px;height:10px;border-radius:50%;background:#28C840;display:inline-block"></span>
				<span class="font-mono" style="font-size:11px;color:#57534E;margin-left:8px">Claude Code · ~/projects/acme</span>
			</div>
			<div class="font-mono text-sm leading-loose p-5 space-y-0.5">
				<div style="display:flex;gap:12px">
					<span style="color:#D97706;font-weight:600;min-width:52px">You</span>
					<span style="color:#F5F5F4;font-weight:500">why did we push the v2 launch back?</span>
				</div>
				<div style="display:flex;gap:12px">
					<span style="color:#44403C;min-width:52px">·</span>
					<span style="color:#44403C;font-size:12px">searched decisions · v2-launch-delay.md</span>
				</div>
				<div style="display:flex;gap:12px">
					<span style="color:#57534E;font-weight:600;min-width:52px">Claude</span>
					<span style="color:#A8A29E">You pushed v2 back 6 weeks to ship enterprise SSO first.</span>
				</div>
				<div style="display:flex;gap:12px">
					<span style="min-width:52px"></span>
					<span style="color:#A8A29E">Three customer calls in October confirmed it as a blocker.</span>
				</div>
			</div>
		</div>
	</section>

	<div class="divider"></div>

	<!-- Navbar -->
	<section>
		<p class="font-mono text-xs uppercase tracking-widest text-base-content/30 mb-5">Navbar</p>
		<div class="navbar bg-base-100/90 backdrop-blur border border-base-300 rounded-xl px-5 min-h-0 py-2.5">
			<div class="navbar-start">
				<span style="font-family:'Unbounded',sans-serif" class="font-black text-base text-primary">pk</span>
			</div>
			<div class="navbar-end flex gap-1">
				<button class="btn bg-base-200 hover:bg-base-300 px-5 py-2 text-sm font-mono text-base-content/50">npm</button>
				<button class="btn bg-base-200 hover:bg-base-300 px-5 py-2 text-sm font-mono text-base-content/50">GitHub</button>
			</div>
		</div>
	</section>

</div>
