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
			href: `${base}/docs/getting-started`,
			label: 'Getting started',
			children: [{ href: `${base}/docs/getting-started/full`, label: 'Full guide' }]
		},
		{ href: `${base}/docs/usage`, label: 'Usage' },
		{
			href: `${base}/docs/reference`,
			label: 'Reference',
			children: [
				{ href: `${base}/docs/reference/cli`, label: 'CLI' },
				{ href: `${base}/docs/reference/config`, label: 'Config' },
				{ href: `${base}/docs/reference/embeddings`, label: 'Embeddings' }
			]
		}
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
						class="rounded-lg px-3 py-1.5 text-sm transition-colors
							{isActive(item.href)
							? 'bg-base-200 font-medium text-base-content'
							: isParentActive(item)
								? 'font-medium text-base-content/70'
								: 'text-base-content/50 hover:text-base-content/80'}"
					>
						{item.label}
					</a>
					{#if item.children}
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
	<main class="min-w-0 flex-1 prose prose-sm max-w-none">
		{@render children()}
	</main>
</div>
