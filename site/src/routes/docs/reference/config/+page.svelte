<script lang="ts">
	import { base } from '$app/paths';
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Config — pk</title>
	<meta name="description" content="Configure pk per-project and global settings." />
</svelte:head>

<div class="space-y-10">
	<div class="not-prose">
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">Config</h1>
		<p class="text-lg text-base-content/60">
			Project and global configuration for pk.
		</p>
	</div>

	<div class="space-y-4">
		<h2>Project config — .pk/config.json</h2>
		<p>
			<code>pk init</code> writes <code>.pk/config.json</code> to your project root. pk commands
			find the knowledge directory by walking up from the current directory — no environment
			variables needed. <code>.pk/</code> is automatically added to your <code>.gitignore</code>.
		</p>
		<div class="not-prose overflow-hidden rounded-xl border border-base-300">
			<table class="table w-full table-sm font-mono text-sm">
				<tbody class="text-base-content/70">
					<tr><td class="w-36">location</td><td>&lt;project-root&gt;/.pk/config.json</td></tr>
					<tr><td>mode: local</td><td>knowledge store at .pk/ (default)</td></tr>
					<tr><td>mode: global</td><td>knowledge store at ~/.pk/&lt;name&gt;/ (--global)</td></tr>
					<tr><td>gitignore</td><td>yes — .pk/ added automatically</td></tr>
				</tbody>
			</table>
		</div>
		<p>
			To switch projects temporarily, set <code>PK_KNOWLEDGE_DIR</code> in your shell.
			The env var takes precedence over <code>.pk/config.json</code>.
		</p>
	</div>

	<div class="space-y-4">
		<h2>Global config — ~/.pk/config.json</h2>
		<p>Settings that apply across all pk projects on your machine.</p>
		<div class="not-prose rounded-xl border border-base-300 bg-base-200 px-5 py-4">
			<p class="font-mono text-xs text-base-content/50">~/.pk/config.json</p>
		</div>
	</div>

	<div class="space-y-4">
		<h2>Embedding config</h2>
		<p>
			Embeddings are optional but strongly recommended — without them, search only matches exact
			keywords. See <a href="{base}/docs/reference/embeddings">Embeddings</a> for why that matters.
		</p>
		<div class="not-prose">
			<CodeBlock
				label="embedding"
				lines={[
					'pk config --embedding nomic-embed-text',
					'pk config --no-embedding',
					'pk config --base-url http://localhost:11434'
				]}
			/>
		</div>
	</div>

	<div class="space-y-4">
		<h2>When to rebuild</h2>
		<p>
			After changing embedding settings, rebuild the index so existing notes get the new vectors.
		</p>
		<div class="not-prose">
			<CodeBlock label="rebuild" lines={['pk index']} />
		</div>
	</div>
</div>
