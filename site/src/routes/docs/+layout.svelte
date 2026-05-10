<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';

	let { children } = $props();

	type NavItem = {
		href: string;
		label: string;
		children?: Array<{ href: string; label: string }>;
	};

	const nav: NavItem[] = [
		{
			href: `${base}/docs/setup`,
			label: 'Setup',
			children: [
				{ href: `${base}/docs/setup/quick`, label: 'Quick setup' },
				{ href: `${base}/docs/setup/full`, label: 'Full guide' }
			]
		},
		{ href: `${base}/docs/cli`, label: 'CLI' },
		{ href: `${base}/docs/config`, label: 'Config' },
		{ href: `${base}/docs/embeddings`, label: 'Embeddings' },
		{ href: `${base}/docs/how-it-works`, label: 'How it works' }
	];

	function isActive(href: string) {
		return $page.url.pathname === href || $page.url.pathname === href + '/';
	}

	function isParentActive(item: NavItem) {
		if (isActive(item.href)) return true;
		return item.children?.some((c) => isActive(c.href)) ?? false;
	}
</script>

<div class="mx-auto flex max-w-5xl gap-12 px-8 pt-28 pb-24">
	<!-- Sidebar -->
	<aside class="hidden w-44 shrink-0 md:block">
		<div class="sticky top-28">
			<p class="mb-3 font-mono text-[10px] tracking-widest text-base-content/30 uppercase">Docs</p>
			<nav class="flex flex-col gap-0.5">
				{#each nav as item}
					<a
						href={item.href}
						class="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors
							{isActive(item.href)
							? 'bg-base-200 font-medium text-base-content'
							: isParentActive(item)
								? 'font-medium text-base-content/70'
								: 'text-base-content/50 hover:text-base-content/80'}"
					>
						<span>{item.label}</span>
						{#if item.children}
							<span class="font-mono text-xs text-base-content/30"
								>{isParentActive(item) ? '⌄' : '›'}</span
							>
						{/if}
					</a>
					{#if item.children && isParentActive(item)}
						{#each item.children as child}
							<a
								href={child.href}
								class="rounded-lg px-3 py-1.5 pl-6 text-sm transition-colors
									{isActive(child.href)
									? 'bg-base-200 font-medium text-base-content'
									: 'text-base-content/40 hover:text-base-content/70'}">{child.label}</a
							>
						{/each}
					{/if}
				{/each}
			</nav>
		</div>
	</aside>

	<!-- Content -->
	<main class="min-w-0 flex-1">
		{@render children()}
	</main>
</div>
