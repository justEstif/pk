<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Semantic search — pk</title>
	<meta name="description" content="Enable Ollama-powered semantic search in pk to find notes by meaning, not just keywords." />
</svelte:head>

<div class="space-y-10">

	<div>
		<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-3xl mb-2">Semantic search</h1>
		<p class="text-base-content/60 text-lg">Find notes by meaning, not just keywords — powered by a local Ollama model.</p>
	</div>

	<!-- Why it matters -->
	<div class="space-y-3">
		<h2 class="font-semibold text-xl">Why it matters</h2>
		<p class="text-base-content/70 leading-relaxed">
			FTS5 keyword search is fast and reliable, but it misses semantic matches.
			Searching <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">database latency</code>
			won't find a note titled "slow queries" unless the terms overlap.
		</p>
		<p class="text-base-content/70 leading-relaxed">
			With embeddings enabled, <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">pk search --semantic</code>
			converts your query to a vector and finds the closest notes by meaning.
			Keyword search continues to work unchanged — <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">--semantic</code> is opt-in per query.
		</p>
	</div>

	<!-- How it works -->
	<div class="space-y-3">
		<h2 class="font-semibold text-xl">How it works</h2>
		<ol class="space-y-2 text-base-content/70 leading-relaxed list-decimal list-inside">
			<li>You configure an Ollama embedding model (e.g. <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">nomic-embed-text</code>).</li>
			<li><code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">pk index</code> generates a float vector for each note and stores it in <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">.index.db</code>.</li>
			<li><code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">pk search --semantic</code> embeds your query and ranks notes by cosine similarity.</li>
		</ol>
		<p class="text-base-content/60 text-sm">
			Everything runs locally — no data leaves your machine. Ollama loads the model into RAM; no GPU required for embedding models like <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-sm">nomic-embed-text</code> (~274 MB).
		</p>
	</div>

	<!-- Setup -->
	<div class="space-y-4">
		<h2 class="font-semibold text-xl">Setup</h2>

		<!-- Step 1 -->
		<div class="space-y-2">
			<p class="font-mono text-xs uppercase tracking-widest text-base-content/40">Step 1 — Install Ollama</p>
			<p class="text-base-content/70 text-sm">Download and install from <a href="https://ollama.com" class="text-primary hover:underline">ollama.com</a>. The installer works on macOS and Linux.</p>
		</div>

		<!-- Step 2 -->
		<div class="space-y-2">
			<p class="font-mono text-xs uppercase tracking-widest text-base-content/40">Step 2 — Pull a model</p>
			<div class="rounded-xl overflow-hidden border border-base-300" style="background:#1C1917">
				<div class="font-mono text-sm px-5 py-4 leading-loose">
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">ollama pull nomic-embed-text</span></div>
				</div>
			</div>
			<p class="text-base-content/50 text-xs font-mono">~274 MB · runs on CPU · no GPU required</p>
		</div>

		<!-- Step 3 -->
		<div class="space-y-2">
			<p class="font-mono text-xs uppercase tracking-widest text-base-content/40">Step 3 — Configure pk</p>
			<div class="rounded-xl overflow-hidden border border-base-300" style="background:#1C1917">
				<div class="font-mono text-sm px-5 py-4 leading-loose">
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk config --embedding nomic-embed-text</span></div>
				</div>
			</div>
		</div>

		<!-- Step 4 -->
		<div class="space-y-2">
			<p class="font-mono text-xs uppercase tracking-widest text-base-content/40">Step 4 — Rebuild index</p>
			<div class="rounded-xl overflow-hidden border border-base-300" style="background:#1C1917">
				<div class="font-mono text-sm px-5 py-4 leading-loose">
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk index</span></div>
				</div>
			</div>
			<p class="text-base-content/60 text-sm">Run this after adding new notes too — embeddings aren't generated automatically on <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-xs">pk new</code>.</p>
		</div>

		<!-- Step 5 -->
		<div class="space-y-2">
			<p class="font-mono text-xs uppercase tracking-widest text-base-content/40">Step 5 — Search by meaning</p>
			<div class="rounded-xl overflow-hidden border border-base-300" style="background:#1C1917">
				<div class="font-mono text-sm px-5 py-4 leading-loose">
					<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk search "slow database queries" --semantic</span></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Models -->
	<div class="space-y-3">
		<h2 class="font-semibold text-xl">Recommended models</h2>
		<div class="overflow-x-auto">
			<table class="table table-sm w-full font-mono text-sm">
				<thead>
					<tr class="text-base-content/40 text-xs uppercase tracking-widest">
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
		<h2 class="font-semibold text-xl">Config reference</h2>
		<div class="rounded-xl overflow-hidden border border-base-300" style="background:#1C1917">
			<div class="font-mono text-sm px-5 py-4 leading-loose space-y-1">
				<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk config --embedding nomic-embed-text</span></div>
				<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk config --no-embedding</span></div>
				<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk config --base-url http://my-host:11434</span><span style="color:#57534E">  # custom Ollama endpoint</span></div>
			</div>
		</div>
		<p class="text-base-content/60 text-sm">Config is stored at <code class="font-mono bg-base-200 px-1.5 py-0.5 rounded text-xs">~/.pk/config.json</code> and applies across all projects.</p>
	</div>

</div>
