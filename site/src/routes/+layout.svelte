<script lang="ts">
	import './layout.css';
	import { base } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	type ThemeMode = 'system' | 'light' | 'dark';
	const modes: ThemeMode[] = ['system', 'light', 'dark'];

	let mode = $state<ThemeMode>('system');
	let dropdownOpen = $state(false);

	function applyTheme(m: ThemeMode) {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const isDark = m === 'dark' || (m === 'system' && prefersDark);
		document.documentElement.dataset.theme = isDark ? 'pk-dark' : 'pk-light';
		localStorage.setItem('pk-theme', m);
	}

	function setMode(m: ThemeMode) {
		mode = m;
		applyTheme(m);
		dropdownOpen = false;
	}

	const icons: Record<ThemeMode, string> = {
		system: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
		light: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
		dark: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
	};

	const modeLabel: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

	$effect(() => {
		const saved = (localStorage.getItem('pk-theme') as ThemeMode | null) ?? 'system';
		mode = saved;
		applyTheme(saved);

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			if (mode === 'system') applyTheme('system');
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen flex-col bg-base-100">
	<!-- Global nav -->
	<nav
		class="fixed top-0 right-0 left-0 z-50 border-b border-base-300 bg-base-100/90 backdrop-blur-md"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between px-8 py-2.5">
			<a
				href="{base}/"
				style="font-family:'Unbounded',sans-serif"
				class="text-base font-black text-primary">pk</a
			>
			<div class="flex items-center gap-1">
				<a
					href="{base}/docs/how-it-works"
					class="btn bg-base-200 px-5 py-2 font-mono text-sm text-base-content/50 hover:bg-base-300"
					>Docs</a
				>

				<!-- Theme dropdown -->
				<div class="relative">
					<button
						class="btn bg-base-200 px-3 py-2 text-base-content/50 hover:bg-base-300"
						onclick={() => (dropdownOpen = !dropdownOpen)}
						title="Theme"
					>
						{@html icons[mode]}
					</button>
					{#if dropdownOpen}
						<!-- Backdrop to close on outside click -->
						<button
							class="fixed inset-0 z-10"
							onclick={() => (dropdownOpen = false)}
							aria-label="Close menu"
						></button>
						<div
							class="absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-lg"
						>
							{#each modes as m}
								<button
									class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
									{mode === m
										? 'bg-base-200 font-medium text-base-content'
										: 'text-base-content/60 hover:bg-base-200'}"
									onclick={() => setMode(m)}
								>
									<span class="text-base-content/50">{@html icons[m]}</span>
									{modeLabel[m]}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</nav>

	<div class="flex-1">
		{@render children()}
	</div>

	<!-- Footer -->
	<footer class="border-t border-base-300 bg-base-100">
		<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-8 py-8">
			<span style="font-family:'Unbounded',sans-serif" class="text-sm font-black text-primary"
				>pk</span
			>
			<div class="flex items-center gap-6">
				<a
					href="https://www.npmjs.com/package/@justestif/pk"
					target="_blank"
					rel="noopener"
					class="font-mono text-xs text-base-content/40 transition-colors hover:text-base-content/70"
					>npm</a
				>
				<a
					href="https://github.com/justEstif/pk"
					target="_blank"
					rel="noopener"
					class="font-mono text-xs text-base-content/40 transition-colors hover:text-base-content/70"
					>GitHub</a
				>
				<span class="font-mono text-xs text-base-content/20">MIT</span>
			</div>
		</div>
	</footer>
</div>
