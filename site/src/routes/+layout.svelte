<script lang="ts">
	import './layout.css';
	import { base } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	type ThemeMode = 'system' | 'light' | 'dark';
	const modes: ThemeMode[] = ['system', 'light', 'dark'];

	let mode = $state<ThemeMode>('system');

	function applyTheme(m: ThemeMode) {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const isDark = m === 'dark' || (m === 'system' && prefersDark);
		document.documentElement.dataset.theme = isDark ? 'pk-dark' : 'pk-light';
		localStorage.setItem('pk-theme', m);
	}

	function setMode(m: ThemeMode) {
		mode = m;
		applyTheme(m);
	}

	const icons: Record<ThemeMode, string> = {
		system: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
		light:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
		dark:   `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
	};

	$effect(() => {
		const saved = (localStorage.getItem('pk-theme') as ThemeMode | null) ?? 'system';
		mode = saved;
		applyTheme(saved);

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => { if (mode === 'system') applyTheme('system'); };
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Global nav -->
<nav class="fixed top-0 left-0 right-0 z-50 border-b border-base-300 bg-base-100/90 backdrop-blur-md">
	<div class="mx-auto max-w-5xl flex items-center justify-between px-8 py-2.5">
		<a href="{base}/" style="font-family:'Unbounded',sans-serif" class="text-base font-black text-primary">pk</a>
		<div class="flex gap-1">
			<a href="{base}/docs/how-it-works" class="btn bg-base-200 hover:bg-base-300 px-5 py-2 text-sm font-mono text-base-content/50">Docs</a>
		</div>
	</div>
</nav>

<!-- Theme toggle — fixed bottom-right -->
<div class="fixed bottom-5 right-5 z-50 flex items-center gap-0.5 bg-base-200 border border-base-300 rounded-lg p-1 shadow-md">
	{#each modes as m}
		<button
			class="flex items-center justify-center w-7 h-7 rounded-md transition-colors
				{mode === m ? 'bg-base-300 text-base-content' : 'text-base-content/30 hover:text-base-content/60'}"
			onclick={() => setMode(m)}
			title={m}
		>
			{@html icons[m]}
		</button>
	{/each}
</div>

{@render children()}

<!-- Footer -->
<footer class="border-t border-base-300 bg-base-100">
	<div class="mx-auto max-w-5xl px-8 py-8 flex flex-wrap items-center justify-between gap-4">
		<span style="font-family:'Unbounded',sans-serif" class="text-sm font-black text-primary">pk</span>
		<div class="flex items-center gap-6">
			<a href="https://www.npmjs.com/package/@justestif/pk" target="_blank" rel="noopener" class="font-mono text-xs text-base-content/40 hover:text-base-content/70 transition-colors">npm</a>
			<a href="https://github.com/justEstif/pk" target="_blank" rel="noopener" class="font-mono text-xs text-base-content/40 hover:text-base-content/70 transition-colors">GitHub</a>
			<span class="font-mono text-xs text-base-content/20">MIT</span>
		</div>
	</div>
</footer>
