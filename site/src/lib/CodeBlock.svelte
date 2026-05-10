<script lang="ts">
	let {
		label,
		lines,
		copyText = lines.join('\n')
	}: {
		label: string;
		lines: string[];
		copyText?: string;
	} = $props();

	let copied = $state(false);

	function copy() {
		navigator.clipboard.writeText(copyText).then(() => {
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		});
	}
</script>

<div class="overflow-hidden rounded-lg" style="background:#1C1917">
	<div class="flex items-center justify-between px-4 py-2" style="border-bottom:1px solid #292524">
		<span class="font-mono text-xs" style="color:#57534E">{label}</span>
		<button
			class="font-mono text-xs transition-colors {copied
				? 'text-success'
				: 'text-base-content/40 hover:text-base-content/60'}"
			onclick={copy}>{copied ? 'copied!' : 'copy'}</button
		>
	</div>
	<div class="px-4 py-3 font-mono text-sm leading-loose">
		{#each lines as line}
			<div>
				<span style="color:#44403C" class="mr-3">$</span><span style="color:#A8A29E">{line}</span>
			</div>
		{/each}
	</div>
</div>
