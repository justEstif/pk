<script lang="ts">
	import { base } from '$app/paths';
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Cowork — pk</title>
	<meta name="description" content="Use pk from Claude Cowork — no terminal required after setup." />
</svelte:head>

<div class="space-y-10">
	<div class="not-prose">
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">Cowork</h1>
		<p class="text-lg text-base-content/60">
			Use pk from Claude Cowork — no terminal required after setup.
		</p>
	</div>

	<!-- Marketplace shortcut -->
	<div class="not-prose rounded-xl border border-primary/30 bg-primary/5 px-5 py-5 space-y-3">
		<p class="font-semibold text-sm">Easiest: install from the Claude Code Marketplace</p>
		<p class="text-sm text-base-content/60">
			Run two commands inside Claude Code — no terminal needed:
		</p>
		<CodeBlock label="Claude Code" lines={[
			'/plugin marketplace add justEstif/pk',
			'/plugin install pk@justestif-pk'
		]} />
		<p class="text-sm text-base-content/60">
			pk is now active in every session. The plugin installs the pk CLI automatically on first run.
		</p>
	</div>

	<!-- Section 1: One-time setup -->
	<section class="space-y-4">
		<h2>Manual setup (terminal)</h2>
		<p>
			Prefer more control, or not yet on Claude Code? You'll need a terminal for about two minutes.
			After that, you're done — pk works automatically in every Cowork project you create.
		</p>

		<div class="space-y-6">
			<!-- Step 1 -->
			<div class="space-y-2">
				<p class="font-semibold">1. Install pk</p>
				<div class="not-prose">
					<CodeBlock label="terminal" lines={['curl -fsSL https://justestif.github.io/pk/install.sh | bash']} />
				</div>
				<p class="text-sm text-base-content/60">
					Installs Bun (required), Git, and pk in one shot.
				</p>
			</div>

			<!-- Step 2 -->
			<div class="space-y-2">
				<p class="font-semibold">2. Create the plugin</p>
				<div class="not-prose">
					<CodeBlock label="terminal" lines={['pk init --harness cowork']} />
				</div>
				<p class="text-sm text-base-content/60">
					This creates <code>~/.pk/cowork-plugin/</code> — a small plugin folder pk manages for you.
					You never need to touch it.
				</p>
			</div>

			<!-- Step 3 -->
			<div class="space-y-2">
				<p class="font-semibold">3. Install the plugin in Cowork</p>
				<div class="not-prose">
					<CodeBlock label="terminal" lines={['claude --plugin-dir ~/.pk/cowork-plugin']} />
				</div>
				<p class="text-sm text-base-content/60">
					Or do it from inside Cowork: <strong>Customize → Upload plugin</strong> → point at
					<code>~/.pk/cowork-plugin</code>.
				</p>
			</div>
		</div>

		<div class="not-prose rounded-xl border border-base-300 bg-base-200 px-5 py-4">
			<p class="font-semibold text-sm">That's it for the terminal. Close it.</p>
			<p class="mt-1 text-sm text-base-content/60">
				The plugin is global — one install covers every project you'll ever create.
			</p>
		</div>
	</section>

	<!-- Section 2: Create a project -->
	<section class="space-y-4">
		<h2>Create a Cowork project</h2>
		<p>
			In Cowork, click <strong>+</strong> → <strong>Start from scratch</strong> → give it a name →
			choose a folder on your computer (for example,
			<code>~/Documents/Claude/Projects/my-blog</code>).
		</p>

		<div class="not-prose rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
			<p class="font-semibold text-sm">The folder you choose is your knowledge base.</p>
			<p class="mt-1 text-sm text-base-content/60">
				pk stores notes at <code>&lt;your-folder&gt;/.pk/</code> automatically — nothing to
				configure. When you open the project in Cowork, pk is already there.
			</p>
		</div>
	</section>

	<!-- Section 3: Just use it -->
	<section class="space-y-4">
		<h2>Ask Claude naturally</h2>
		<p>
			When you open a project, pk has already prepared a summary of your knowledge. You don't need
			to ask for it — just start working.
		</p>
		<p>Tell Claude what you want in plain language:</p>

		<div class="not-prose space-y-0 divide-y divide-base-300 rounded-xl border border-base-300">
			{#each [
				{ prompt: '"Save a note about this decision"', result: 'Creates a structured, searchable note' },
				{ prompt: '"What do we know about auth?"', result: 'Searches your knowledge base' },
				{ prompt: '"Summarize what\'s been decided so far"', result: 'Synthesizes context across all notes' },
				{ prompt: '"Delete the note about the old API"', result: 'Removes it and commits the deletion' },
			] as example}
				<div class="flex gap-4 px-5 py-3">
					<span class="w-72 shrink-0 font-mono text-sm text-base-content/70">{example.prompt}</span>
					<span class="text-sm text-base-content/40">{example.result}</span>
				</div>
			{/each}
		</div>

		<p class="text-sm text-base-content/60">
			Notes are committed to git automatically — you have full history and can always recover
			anything.
		</p>
	</section>

	<!-- Section 4: Footer link -->
	<div class="not-prose border-t border-base-300 pt-6">
		<p class="text-sm text-base-content/40">
			Curious how it works? <a href="{base}/docs/reference/mcp" class="link">MCP reference →</a>
		</p>
	</div>
</div>
