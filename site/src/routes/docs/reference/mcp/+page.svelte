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
		<p>
			In Cowork, each project has a folder on disk (<code>~/Documents/Claude/Projects/&lt;name&gt;/</code>).
			That folder is the pk project root — knowledge lives at <code>&lt;project-folder&gt;/.pk/</code>,
			co-located with the project rather than in a global store.
		</p>
	</section>

	<!-- Setup -->
	<section class="space-y-4">
		<h2>Setup</h2>
		<p>Run once from your terminal. A single global plugin serves every Cowork project — no per-project init required.</p>

		<div class="not-prose space-y-3">
			<CodeBlock
				label="Claude Cowork"
				lines={['pk init --harness cowork']}
			/>
		</div>

		<p>This creates <code>~/.pk/cowork-plugin/</code> — a shared plugin directory containing <code>.mcp.json</code>, <code>plugin.json</code>, and the pk skill bundle. Install it with:</p>
		<div class="not-prose">
			<CodeBlock
				label="install"
				lines={['claude --plugin-dir ~/.pk/cowork-plugin']}
			/>
		</div>
		<p>Or upload via Cowork → Customize → Upload plugin. The pk tools will appear in your next conversation.</p>

		<p>Once installed, every Cowork project automatically gets its own <code>.pk/</code> knowledge base — created on the first session if it doesn't exist yet.</p>
	</section>

	<!-- What gets written -->
	<section class="space-y-4">
		<h2>What gets written</h2>
		<div class="not-prose">
			<div class="rounded-xl border border-base-300 bg-base-200 px-5 py-4 space-y-2">
				<p class="font-mono text-xs text-base-content/40">cowork</p>
				<p class="font-mono text-xs text-base-content/70">~/.pk/cowork-plugin/</p>
				<p class="text-xs text-base-content/50">Plugin directory (plugin.json, .mcp.json, skill bundle)</p>
			</div>
		</div>
		<p>
			The plugin sets <code>PK_KNOWLEDGE_DIR</code> to <code>{`${CLAUDE_PROJECT_DIR}/.pk`}</code>.
			Cowork substitutes the current project's folder path at runtime, so the knowledge base always
			lives alongside the project — not at a hardcoded location. The binary path is resolved at init
			time so Cowork can find <code>pk</code> regardless of its minimal launch PATH.
		</p>
	</section>

	<!-- Session priming -->
	<section class="space-y-3">
		<h2>Session priming</h2>
		<p>
			After every write operation — and at server startup — <code>pk mcp</code> writes a knowledge
			summary to <code>&lt;project&gt;/.claude/rules/pk.md</code>. Cowork reads files in
			<code>.claude/rules/</code> natively at the start of each session via InstructionsLoaded,
			so your agent arrives pre-oriented with the project's current knowledge state. No manual
			priming step needed.
		</p>
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

	<!-- Log file -->
	<section class="space-y-3">
		<h2>Log file</h2>
		<p>
			Every operation — CLI and MCP — is logged to <code>~/.pk/pk.jsonl</code>. One JSON line per operation with timestamp, tool name, knowledge directory, duration, and status. Useful for debugging when something fails silently in a desktop session.
		</p>
		<div class="not-prose overflow-hidden rounded-xl" style="background:#1C1917">
			<div class="px-4 py-2 font-mono text-xs" style="color:#57534E;border-bottom:1px solid #292524">~/.pk/pk.jsonl</div>
			<div class="px-4 py-3 font-mono text-xs leading-loose" style="color:#A8A29E">
				<div>{'{"ts":"2026-05-13T18:00:00Z","source":"mcp","op":"pk_new","dir":"/Users/x/Documents/Claude/Projects/my-project/.pk","ms":1234,"status":"ok"}'}</div>
				<div>{'{"ts":"2026-05-13T18:00:05Z","source":"cli","op":"search","dir":"/Users/x/Documents/Claude/Projects/my-project/.pk","ms":89,"status":"ok"}'}</div>
			</div>
		</div>
		<p class="text-sm text-base-content/50">Pruned to the last 2000 lines when the file exceeds 2 MB.</p>
	</section>
</div>
