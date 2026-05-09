<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';

	let { children } = $props();

	const nav = [
		{ href: `${base}/docs/how-it-works`, label: 'How it works' },
		{ href: `${base}/setup`, label: 'Setup guide' },
	];
</script>

<div class="mx-auto max-w-5xl px-8 pt-28 pb-24 flex gap-12">

	<!-- Sidebar -->
	<aside class="hidden md:block w-44 shrink-0">
		<div class="sticky top-28">
			<p class="font-mono text-[10px] uppercase tracking-widest text-base-content/30 mb-3">Docs</p>
			<nav class="flex flex-col gap-0.5">
				{#each nav as item}
					<a
						href={item.href}
						class="text-sm px-3 py-1.5 rounded-lg transition-colors
							{$page.url.pathname === item.href || $page.url.pathname === item.href + '/'
								? 'bg-base-200 text-base-content font-medium'
								: 'text-base-content/50 hover:text-base-content/80'}"
					>{item.label}</a>
				{/each}
			</nav>
			<div class="mt-8 pt-6 border-t border-base-300">
				<a href="{base}/" class="font-mono text-xs text-base-content/30 hover:text-base-content/60 transition-colors">← pk</a>
			</div>
		</div>
	</aside>

	<!-- Content -->
	<main class="min-w-0 flex-1">
		<!-- Mobile back link -->
		<a href="{base}/" class="md:hidden inline-flex items-center gap-1.5 font-mono text-sm text-base-content/40 hover:text-base-content/70 transition-colors mb-8">
			← pk
		</a>
		{@render children()}
	</main>

</div>
