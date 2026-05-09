<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';

	let { children } = $props();

	const nav = [
		{ href: `${base}/docs/how-it-works`, label: 'How it works' },
		{ href: `${base}/docs/setup`, label: 'Setup guide' },
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
		</div>
	</aside>

	<!-- Content -->
	<main class="min-w-0 flex-1">
		{@render children()}
	</main>

</div>
