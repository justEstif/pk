<script lang="ts">
	import { base } from '$app/paths';
	import CodeBlock from '$lib/CodeBlock.svelte';
</script>

<svelte:head>
	<title>MCP — pk</title>
	<meta name="description" content="Use pk from Claude Cowork — Claude's agentic tab — via the MCP protocol." />
</svelte:head>

<div class="space-y-10">
	<div class="not-prose">
		<h1 style="font-family:'Unbounded',sans-serif" class="mb-2 text-3xl font-black">MCP</h1>
		<p class="text-lg text-base-content/60">
			Use pk from Claude Cowork — Claude's agentic tab.
		</p>
	</div>

	<!-- What it is -->
	<section class="space-y-3">
		<h2>What this is for</h2>
		<p>
			CLI harnesses (Claude Code, OpenCode, Pi) inject context via hooks — they need a terminal session
			to run. Desktop apps don't have that. MCP is the alternative: pk runs as a background server,
			and the app calls its tools directly.
		</p>
		<p>
			The tools are identical to the CLI commands. <code>pk_search</code> is <code>pk search</code>.
			<code>pk_new</code> is <code>pk new</code>. Same logic, different transport.
		</p>
	</section>

	<!-- Setup -->
	<section class="space-y-4">
		<h2>Setup</h2>
		<p>Run once from your terminal. Desktop apps launch with no project folder, so <code>--global</code> is required.</p>

		<div class="not-prose space-y-3">
			<CodeBlock
				label="Claude Cowork"
				lines={['pk init my-project --harness cowork --global']}
			/>
		</div>

		<p>This creates <code>~/.pk/my-project-cowork/</code> — a Cowork plugin directory containing <code>.mcp.json</code>, <code>plugin.json</code>, and the pk skill bundle. Install it with:</p>
		<div class="not-prose">
			<CodeBlock
				label="install"
				lines={['claude --plugin-dir ~/.pk/my-project-cowork']}
			/>
		</div>
		<p>Or upload via Cowork → Customize → Upload plugin. The pk tools will appear in your next conversation.</p>

		<p>Re-running <code>pk init</code> with the same name updates the config entry — it doesn't duplicate it.</p>
	</section>

	<!-- What gets written -->
	<section class="space-y-4">
		<h2>What gets written</h2>
		<div class="not-prose">
			<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4 space-y-2">
				<p class="font-mono text-xs text-base-content/40">cowork</p>
				<p class="font-mono text-xs text-base-content/70">~/.pk/&lt;name&gt;-cowork/</p>
				<p class="text-xs text-base-content/50">Plugin directory (plugin.json, .mcp.json, skill bundle)</p>
			</div>
		</div>
		<p>The plugin sets <code>PK_KNOWLEDGE_DIR</code> to your global knowledge store. The binary path is resolved at init time — Cowork launches with a minimal PATH that won't find <code>pk</code> otherwise.</p>
	</section>

	<!-- Tools -->
	<section class="space-y-4">
		<h2>Available tools</h2>
		<div class="not-prose">
			{#each [
				{ name: 'pk_search', desc: 'Search notes by keyword or meaning' },
				{ name: 'pk_synthesize', desc: 'Ranked context summary — use sessionStart=true at conversation start' },
				{ name: 'pk_new', desc: 'Create a typed note' },
				{ name: 'pk_read', desc: 'Read full note contents' },
				{ name: 'pk_write', desc: 'Write updated note content and commit' },
				{ name: 'pk_delete', desc: 'Delete a note (recoverable from git)' },
				{ name: 'pk_vocab', desc: 'List tags by frequency' },
				{ name: 'pk_lint', desc: 'Validate note structure' },
				{ name: 'pk_history', desc: 'View operation history' },
			] as tool}
				<div class="flex gap-4 border-b border-base-300 py-2.5 last:border-0">
					<span class="w-36 shrink-0 font-mono text-xs text-primary/70 pt-0.5">{tool.name}</span>
					<span class="text-sm text-base-content/60">{tool.desc}</span>
				</div>
			{/each}
		</div>
		<p>There is also a <code>pk-session-context</code> prompt — request it at the start of a conversation to orient your agent without calling a tool.</p>
	</section>

	<!-- Multiple projects -->
	<section class="space-y-3">
		<h2>Multiple projects</h2>
		<p>Run <code>pk init</code> once per project. Each creates a separate named entry in the config:</p>
		<div class="not-prose">
			<CodeBlock
				label="one per project"
				lines={[
					'pk init project-alpha --harness cowork --global',
					'pk init project-beta --harness cowork --global',
				]}
			/>
		</div>
		<p>The agent uses the right server based on context — tell it which project you're discussing and it will use the matching tools.</p>
	</section>

	<!-- Log file -->
	<section class="space-y-3">
		<h2>Log file</h2>
		<p>
			Every operation — CLI and MCP — is logged to <code>~/.pk/pk.jsonl</code>. One JSON line per operation with timestamp, tool name, knowledge directory, duration, and status. Useful for debugging when something fails silently in a desktop session.
		</p>
		<div class="not-prose overflow-hidden rounded-xl" style="background:#1C1917">
			<div class="px-4 py-2 font-mono text-xs" style="color:#57534E;border-bottom:1px solid #292524">~/.pk/pk.jsonl</div>
			<div class="px-4 py-3 font-mono text-xs leading-loose" style="color:#A8A29E">
				<div>{'{"ts":"2026-05-13T18:00:00Z","source":"mcp","op":"pk_new","dir":"/Users/x/.pk/my-project","ms":1234,"status":"ok"}'}</div>
				<div>{'{"ts":"2026-05-13T18:00:05Z","source":"cli","op":"search","dir":"/Users/x/.pk/my-project","ms":89,"status":"ok"}'}</div>
			</div>
		</div>
		<p class="text-sm text-base-content/50">Pruned to the last 2000 lines when the file exceeds 2 MB.</p>
	</section>
</div>
