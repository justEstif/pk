<script lang="ts">
	import { base } from '$app/paths';
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Semantic search — pk</title>
	<meta
		name="description"
		content="Enable Ollama-powered semantic search in pk to find notes by meaning, not just keywords."
	/>
</svelte:head>

<div class="space-y-10">
	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">
			Semantic search
		</h1>
		<p class="text-lg text-base-content/60">
			Find notes by meaning, not just keywords — powered by a local Ollama model.
		</p>
	</div>

	<!-- Why it matters -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Why it matters</h2>
		<p class="leading-relaxed text-base-content/70">
			FTS5 keyword search is fast and reliable, but it misses semantic matches. Searching <code
				class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm">database latency</code
			>
			won't find a note titled "slow queries" unless the terms overlap.
		</p>
		<p class="leading-relaxed text-base-content/70">
			With embeddings enabled, <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm"
				>pk search --semantic</code
			>
			converts your query to a vector and finds the closest notes by meaning. Keyword search continues
			to work unchanged —
			<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm">--semantic</code> is opt-in per
			query.
		</p>
	</div>

	<!-- How it works -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">How it works</h2>
		<ol class="list-inside list-decimal space-y-2 leading-relaxed text-base-content/70">
			<li>
				You configure an Ollama embedding model (e.g. <code
					class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm">nomic-embed-text</code
				>).
			</li>
			<li>
				<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm">pk index</code> generates
				a float vector for each note and stores it in
				<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm">.index.db</code>.
			</li>
			<li>
				<code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm">pk search --semantic</code
				> embeds your query and ranks notes by cosine similarity.
			</li>
		</ol>
		<p class="text-sm text-base-content/60">
			Everything runs locally — no data leaves your machine. Ollama loads the model into RAM; no GPU
			required for embedding models like <code
				class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-sm">nomic-embed-text</code
			> (~274 MB).
		</p>
	</div>

	<!-- Setup -->
	<div class="space-y-4">
		<h2 class="text-xl font-semibold">Setup</h2>

		<!-- Step 1 -->
		<div class="space-y-2">
			<p class="font-mono text-xs tracking-widest text-base-content/40 uppercase">
				Step 1 — Install Ollama
			</p>
			<p class="text-sm text-base-content/70">
				Download and install from <a href="https://ollama.com" class="text-primary hover:underline"
					>ollama.com</a
				>. The installer works on macOS and Linux.
			</p>
		</div>

		<!-- Step 2 -->
		<div class="space-y-2">
			<p class="font-mono text-xs tracking-widest text-base-content/40 uppercase">
				Step 2 — Pull a model
			</p>
			<CodeBlock label="ollama" lines={['ollama pull nomic-embed-text']} />
			<p class="font-mono text-xs text-base-content/50">~274 MB · runs on CPU · no GPU required</p>
		</div>

		<!-- Step 3 -->
		<div class="space-y-2">
			<p class="font-mono text-xs tracking-widest text-base-content/40 uppercase">
				Step 3 — Configure pk
			</p>
			<CodeBlock label="configure" lines={['pk config --embedding nomic-embed-text']} />
		</div>

		<!-- Step 4 -->
		<div class="space-y-2">
			<p class="font-mono text-xs tracking-widest text-base-content/40 uppercase">
				Step 4 — Rebuild index
			</p>
			<CodeBlock label="index" lines={['pk index']} />
			<p class="text-sm text-base-content/60">
				Run this after adding new notes too — embeddings aren't generated automatically on <code
					class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs">pk new</code
				>.
			</p>
		</div>

		<!-- Step 5 -->
		<div class="space-y-2">
			<p class="font-mono text-xs tracking-widest text-base-content/40 uppercase">
				Step 5 — Search by meaning
			</p>
			<CodeBlock label="search" lines={['pk search "slow database queries" --semantic']} />
		</div>
	</div>

	<!-- Models -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Recommended models</h2>
		<div class="overflow-x-auto">
			<table class="table w-full table-sm font-mono text-sm">
				<thead>
					<tr class="text-xs tracking-widest text-base-content/40 uppercase">
						<th>Model</th>
						<th>Size</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody class="text-base-content/70">
					<tr>
						<td>nomic-embed-text</td>
						<td>274 MB</td>
						<td>Best balance of quality and speed — default recommendation</td>
					</tr>
					<tr>
						<td>mxbai-embed-large</td>
						<td>670 MB</td>
						<td>Higher quality, slightly larger</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Config reference -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Config reference</h2>
		<CodeBlock
			label="config reference"
			lines={[
				'pk config --embedding nomic-embed-text',
				'pk config --no-embedding',
				'pk config --base-url http://my-host:11434'
			]}
		/>
		<p class="text-sm text-base-content/60">
			Config is stored at <code class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs"
				>~/.pk/config.json</code
			> and applies across all projects.
		</p>
	</div>
</div>
