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
</svelte:head>

<!-- Hero -->
<div
	class="pt-28 pb-16"
	style="background-image: linear-gradient(oklch(var(--bc)/0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--bc)/0.04) 1px, transparent 1px); background-size: 48px 48px;"
>
	<div class="mx-auto max-w-3xl px-8">

		<h1 style="font-family:'Unbounded',sans-serif" class="font-black text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.06] tracking-tight mb-5">
			Structured bookkeeping<br />for every project.
		</h1>

		<p class="text-lg leading-relaxed text-base-content/60 mb-9 max-w-xl">
			Drop in information as you work — a decision, a Slack thread, a doc, a question you haven't
			answered yet. Your agent organizes it. The more you put in, the more useful it gets.
		</p>

		<!-- Install widget -->
		<div class="rounded-xl overflow-hidden border border-base-300 border-l-4 border-l-primary mb-1">
			<div class="flex items-center bg-base-200 border-b border-base-300">
				{#each (['npm', 'bun', 'brew'] as const) as pkg}
					<button
						class="font-mono text-sm px-5 py-3 border-r border-base-300 transition-colors
							{activePkg === pkg ? 'bg-base-300 text-primary' : 'text-base-content/30 hover:text-base-content/60'}"
						onclick={() => (activePkg = pkg)}
					>{pkg}</button>
				{/each}
				<div class="flex-1"></div>
				<button
					class="btn btn-ghost btn-sm px-3 font-mono text-xs text-base-content/40 transition-colors {copied ? 'text-success' : ''}"
					onclick={copyInstall}
				>
					{copied ? 'copied!' : 'copy'}
				</button>
			</div>
			<div class="font-mono text-sm px-5 py-4 leading-loose" style="background:#1C1917">
				<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">{pkgCmds[activePkg]}</span></div>
				<div><span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">pk init</span></div>
			</div>
		</div>

		<!-- Supported harnesses -->
		<div class="flex flex-wrap gap-x-6 gap-y-1 mb-8">
			{#each ['Claude Code', 'Codex', 'OpenCode'] as harness}
				<span class="font-mono text-sm text-base-content/40 flex items-center gap-1.5">
					<span class="text-[6px] text-primary/50">●</span>{harness}
				</span>
			{/each}
		</div>

		<!-- CTA -->
		<div class="flex flex-col items-start gap-1.5 mb-12">
			<a href="{base}/docs/setup/newcomers" class="btn btn-primary px-8 py-3 text-base">Get started →</a>
			<span class="font-mono text-xs text-base-content/30">step-by-step setup guide</span>
		</div>

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
						{activeTab === id ? 'text-primary border-b-base-200 relative z-[1]' : 'text-base-content/40 hover:text-base-content/60'}"
					onclick={() => (activeTab = id as typeof activeTab)}
				>
					{id} <span class="text-[11px] {activeTab === id ? 'text-primary/50' : 'text-base-content/30'} ml-1">{hint}</span>
				</button>
			{/each}
		</div>

		<!-- Terminal window -->
		<div class="rounded-b rounded-tr overflow-hidden border border-base-300" style="background:#1C1917">
			<div style="background:#292524; padding:10px 14px; display:flex; align-items:center; gap:6px; border-bottom:1px solid #312E2B">
				<span style="width:10px;height:10px;border-radius:50%;background:#FF5F57;display:inline-block"></span>
				<span style="width:10px;height:10px;border-radius:50%;background:#FEBC2E;display:inline-block"></span>
				<span style="width:10px;height:10px;border-radius:50%;background:#28C840;display:inline-block"></span>
				<span class="font-mono" style="font-size:11px;color:#57534E;margin-left:8px">
					Claude Code · {scenarios[activeTab].label}
				</span>
			</div>
			<div class="font-mono text-sm leading-loose p-5 max-h-[400px] overflow-y-auto" style="color:#A8A29E">
				{#each scenarios[activeTab].lines as line}
					{#if line.type === 'divider'}
						<div style="border-top:1px dashed #292524; margin:10px 0"></div>
					{:else if line.type === 'you'}
						<div style="display:flex;gap:12px">
							<span style="color:#D97706;font-weight:600;min-width:52px">You</span>
							<span style="color:#F5F5F4;font-weight:500">{line.text?.replace('You: ', '')}</span>
						</div>
					{:else if line.type === 'lookup'}
						<div style="display:flex;gap:12px">
							<span style="color:#44403C;min-width:52px">·</span>
							<span style="color:#44403C;font-size:12px">{line.text}</span>
						</div>
					{:else if line.type === 'agent'}
						<div style="display:flex;gap:12px">
							<span style="color:#57534E;font-weight:600;min-width:52px">Claude</span>
							<span style="color:#A8A29E">{line.text?.replace('Claude: ', '')}</span>
						</div>
					{:else if line.type === 'cont'}
						<div style="display:flex;gap:12px">
							<span style="min-width:52px"></span>
							<span style="color:#A8A29E">
								{line.text}{#if line.cursor} <span style="color:#D97706">▌</span>{/if}
							</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>

	</div>
</div>
