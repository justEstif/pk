<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Setup — pk</title>
</svelte:head>

<div class="space-y-10">

	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-3xl mb-2">Setup</h1>
		<p class="text-base-content/60 text-lg">Pick the path that fits where you are.</p>
	</div>

	<div class="grid sm:grid-cols-2 gap-4">
		<a href="{base}/docs/setup/engineers" class="card card-border bg-base-200 hover:bg-base-300 transition-colors cursor-pointer group">
			<div class="card-body gap-3">
				<div class="font-mono text-xs uppercase tracking-widest text-primary/60">Quick setup</div>
				<h2 class="font-semibold text-lg">I already use Claude Code, Codex, or OpenCode</h2>
				<p class="text-base-content/60 text-sm leading-relaxed">
					Just install pk and run <code class="font-mono bg-base-300 px-1.5 py-0.5 rounded text-xs">pk init</code>. Takes two minutes.
				</p>
				<div class="font-mono text-xs text-primary/70 group-hover:text-primary transition-colors mt-1">Quick setup →</div>
			</div>
		</a>

		<a href="{base}/docs/setup/newcomers" class="card card-border bg-base-200 hover:bg-base-300 transition-colors cursor-pointer group">
			<div class="card-body gap-3">
				<div class="font-mono text-xs uppercase tracking-widest text-base-content/30">Full guide</div>
				<h2 class="font-semibold text-lg">I'm new to AI coding tools</h2>
				<p class="text-base-content/60 text-sm leading-relaxed">
					We'll walk through everything — Git, Bun, your AI tool, and pk — step by step.
				</p>
				<div class="font-mono text-xs text-base-content/40 group-hover:text-base-content/70 transition-colors mt-1">Full setup guide →</div>
			</div>
		</a>
	</div>

</div>
