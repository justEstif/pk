<script lang="ts">
	import { base } from '$app/paths';

	type LineType = 'you' | 'agent' | 'cont' | 'lookup' | 'divider';
	interface Line {
		type: LineType;
		text?: string;
		cursor?: boolean;
	}
	interface Scenario {
		label: string;
		lines: Line[];
	}

	const scenarios: Record<string, Scenario> = {
		acme: {
			label: '~/projects/acme',
			lines: [
				{ type: 'you', text: 'You: why did we push the v2 launch back?' },
				{ type: 'lookup', text: 'searched decisions · v2-launch-delay.md' },
				{ type: 'agent', text: 'Claude: You pushed v2 back 6 weeks to ship enterprise SSO first.' },
				{ type: 'cont', text: 'Three customer calls in mid-October confirmed it as a blocker.' },
				{ type: 'divider' },
				{ type: 'you', text: 'You: any open questions on the enterprise tier?' },
				{ type: 'lookup', text: 'searched questions · enterprise-pricing.md, enterprise-sla.md' },
				{ type: 'agent', text: 'Claude: Two open questions — SSO pricing and the SLA commitment.' },
				{ type: 'cont', text: 'Both still unresolved.' },
				{ type: 'divider' },
				{ type: 'you', text: 'You: log that we decided SSO is included, not an add-on.' },
				{ type: 'lookup', text: 'created decisions/sso-pricing.md' },
				{ type: 'cont', text: 'Claude: Saved. Marked enterprise-pricing.md as answered.', cursor: true }
			]
		},
		nova: {
			label: '~/projects/nova',
			lines: [
				{ type: 'you', text: 'You: catch me up — what are we working on?' },
				{ type: 'lookup', text: 'synthesized 5 notes · 2 open questions, 3 decisions' },
				{ type: 'agent', text: "Claude: Nova is a clinical trials research tool. You're mid-way" },
				{ type: 'cont', text: 'through the data ingestion pipeline. Two open questions: the export' },
				{ type: 'cont', text: 'format for regulators and whether to self-host the LLM.' },
				{ type: 'divider' },
				{ type: 'you', text: 'You: what did we decide about the LLM?' },
				{ type: 'lookup', text: 'searched decisions · llm-hosting.md' },
				{ type: 'agent', text: "Claude: Self-host on-prem. Patient data can't leave the hospital" },
				{ type: 'cont', text: 'network — regulatory requirement, non-negotiable.' },
				{ type: 'divider' },
				{ type: 'you', text: 'You: what export format are regulators asking for?' },
				{ type: 'lookup', text: 'searched questions · regulator-export-format.md' },
				{ type: 'agent', text: 'Claude: Still open. Last note says FDA asked for HL7 FHIR but' },
				{ type: 'cont', text: "the team hasn't confirmed feasibility yet.", cursor: true }
			]
		},
		atlas: {
			label: '~/clients/atlas',
			lines: [
				{ type: 'you', text: 'You: first day on atlas — what do I need to know?' },
				{ type: 'lookup', text: 'synthesized 6 notes · 3 open questions, 4 decisions' },
				{ type: 'agent', text: "Claude: Atlas is a logistics platform. They're mid-migration from" },
				{ type: 'cont', text: 'monolith to services. Postgres is source of truth. Mobile app' },
				{ type: 'cont', text: 'is owned by a separate vendor team.' },
				{ type: 'divider' },
				{ type: 'you', text: 'You: why Postgres over MongoDB?' },
				{ type: 'lookup', text: 'searched decisions · database-choice.md' },
				{ type: 'agent', text: 'Claude: Shipment tracking is inherently relational — joins' },
				{ type: 'cont', text: 'outperformed document lookups in load tests.' },
				{ type: 'divider' },
				{ type: 'you', text: 'You: is the vendor team aware of the migration timeline?' },
				{ type: 'lookup', text: 'searched questions · vendor-migration-sync.md' },
				{ type: 'agent', text: 'Claude: Open question — no record of them being looped in.' },
				{ type: 'cont', text: 'Flagged as a risk back in March. Still unresolved.', cursor: true }
			]
		}
	};

	let activeTab = $state<'acme' | 'nova' | 'atlas'>('acme');
	let activePkg = $state<'npm' | 'bun' | 'brew'>('npm');
	let copied = $state(false);

	const pkgCmds = {
		npm: 'npm install -g @justestif/pk',
		bun: 'bun install -g @justestif/pk',
		brew: 'brew install justEstif/tap/pk'
	};

	function copyInstall() {
		navigator.clipboard.writeText(pkgCmds[activePkg] + ' && pk init').then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<svelte:head>
	<title>pk</title>
	<meta
		name="description"
		content="Structured bookkeeping for every project. Decisions, questions, notes, and sources — organized, searchable, stored locally."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Unbounded:wght@900&family=JetBrains+Mono:wght@400;500&family=Hanken+Grotesk:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- Nav -->
<nav class="fixed top-0 left-0 right-0 z-50 border-b border-base-300 bg-base-100/90 backdrop-blur-md">
	<div class="mx-auto max-w-3xl flex items-center justify-between px-8 py-3.5">
		<span class="font-[Unbounded] text-base font-black text-amber-400">pk</span>
		<div class="flex gap-2">
			<a
				href="https://www.npmjs.com/package/@justestif/pk"
				target="_blank"
				rel="noopener"
				class="font-mono text-xs px-3 py-1.5 border border-base-300 rounded text-base-content/40 hover:text-base-content hover:border-base-content/30 transition-colors"
			>
				npm ↗
			</a>
			<a
				href="https://github.com/justEstif/pk"
				target="_blank"
				rel="noopener"
				class="font-mono text-xs px-3 py-1.5 border border-base-300 rounded text-base-content/40 hover:text-base-content hover:border-base-content/30 transition-colors"
			>
				GitHub ↗
			</a>
		</div>
	</div>
</nav>

<!-- Hero -->
<div
	class="pt-28 pb-16"
	style="background-image: linear-gradient(oklch(var(--bc)/0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--bc)/0.06) 1px, transparent 1px); background-size: 48px 48px;"
>
	<div class="mx-auto max-w-3xl px-8">

		<h1 class="font-[Unbounded] font-black text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.06] tracking-tight mb-5">
			Structured bookkeeping<br />for every project.
		</h1>

		<p class="text-lg leading-relaxed text-base-content/60 mb-9 max-w-xl">
			Drop in information as you work — a decision, a Slack thread, a doc, a question you haven't
			answered yet. Your agent organizes it. The more you put in, the more useful it gets.
		</p>

		<!-- Install widget -->
		<div class="bg-base-200 border border-base-300 border-l-4 border-l-amber-400 rounded-md mb-1">
			<div class="flex items-center justify-between border-b border-base-300 pr-3">
				<div class="flex">
					{#each (['npm', 'bun', 'brew'] as const) as pkg}
						<button
							class="font-mono text-sm px-4 py-2.5 border-r border-base-300 transition-colors
								{activePkg === pkg ? 'text-amber-400 bg-base-300' : 'text-base-content/40 hover:text-base-content/60'}"
							onclick={() => (activePkg = pkg)}
						>
							{pkg}
						</button>
					{/each}
				</div>
				<button
					class="flex items-center gap-1.5 font-mono text-xs transition-colors {copied ? 'text-emerald-400' : 'text-base-content/40 hover:text-base-content/60'}"
					onclick={copyInstall}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					{copied ? 'copied!' : 'copy'}
				</button>
			</div>
			<div class="font-mono text-[15px] px-4 py-3.5 text-base-content/60 leading-loose">
				<div><span class="text-base-content/30">$</span> {pkgCmds[activePkg]}</div>
				<div><span class="text-base-content/30">$</span> pk init</div>
			</div>
		</div>

		<div class="font-mono text-xs text-emerald-400 h-4 mb-1">{copied ? 'Copied!' : ''}</div>

		<!-- Supported harnesses -->
		<div class="flex flex-wrap justify-between gap-y-1 mb-7">
			{#each ['Claude Code', 'Codex', 'OpenCode'] as harness}
				<span class="font-mono text-sm text-base-content/50 flex items-center gap-1.5">
					<span class="text-[6px] text-amber-400/60">●</span>{harness}
				</span>
			{/each}
		</div>

		<!-- Get started -->
		<a href="{base}/setup" class="btn btn-primary mb-10">Get started ↗</a>

		<!-- Terminal demo -->
		<div class="font-mono text-[11px] uppercase tracking-widest text-base-content/30 mb-2.5">
			example session
		</div>

		<div class="grid grid-cols-3 gap-[2px]" role="tablist">
			{#each [['acme', 'startup'], ['nova', 'research'], ['atlas', 'consulting']] as [id, hint]}
				<button
					role="tab"
					aria-selected={activeTab === id}
					class="font-mono text-sm py-2.5 text-center bg-base-200 border border-base-300 border-b-0 rounded-t transition-colors
						{activeTab === id ? 'text-amber-400 border-b-base-200 relative z-[1]' : 'text-base-content/40 hover:text-base-content/60'}"
					onclick={() => (activeTab = id as typeof activeTab)}
				>
					{id} <span class="text-[11px] {activeTab === id ? 'text-amber-400/50' : 'text-base-content/30'} ml-1">{hint}</span>
				</button>
			{/each}
		</div>

		<div class="bg-base-200 border border-base-300 rounded-b rounded-tr overflow-hidden">
			<div class="bg-base-300 border-b border-base-300 px-3.5 py-2 flex items-center gap-1.5">
				<span class="w-2.5 h-2.5 rounded-full bg-[#ff5f57]"></span>
				<span class="w-2.5 h-2.5 rounded-full bg-[#febc2e]"></span>
				<span class="w-2.5 h-2.5 rounded-full bg-[#28c840]"></span>
				<span class="font-mono text-[11px] text-base-content/30 ml-1.5">
					Claude Code · {scenarios[activeTab].label}
				</span>
			</div>
			<div class="font-mono text-sm leading-[1.85] p-5 max-h-[400px] overflow-y-auto">
				{#each scenarios[activeTab].lines as line}
					{#if line.type === 'divider'}
						<div class="border-t border-dashed border-base-300 my-3"></div>
					{:else if line.type === 'you'}
						<div class="text-base-content font-medium border-l-2 border-amber-400 pl-2.5 -ml-3">{line.text}</div>
					{:else if line.type === 'agent'}
						<div class="text-base-content/60">{line.text}</div>
					{:else if line.type === 'cont'}
						<div class="text-base-content/60 pl-12">
							{line.text}{#if line.cursor} <span class="text-amber-400">▌</span>{/if}
						</div>
					{:else if line.type === 'lookup'}
						<div class="text-[12px] text-base-content/30 my-0.5">
							<span class="text-amber-400/50 mr-0.5">·</span>{line.text}
						</div>
					{/if}
				{/each}
			</div>
		</div>

	</div>
</div>
