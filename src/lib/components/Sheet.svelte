<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		onclose,
		label,
		variant = 'bottom',
		children
	}: {
		open: boolean;
		onclose: () => void;
		label: string;
		/** `top` stays clear of the on-screen keyboard (used for text entry). */
		variant?: 'bottom' | 'top';
		children: Snippet;
	} = $props();

	let el: HTMLDialogElement;

	$effect(() => {
		if (open && !el.open) el.showModal();
		else if (!open && el.open) el.close();
	});
</script>

<!-- Native dialog: focus trap, Escape and backdrop come for free. -->
<dialog
	bind:this={el}
	class={variant === 'top' ? 'top-sheet' : 'sheet'}
	aria-label={label}
	{onclose}
	onclick={(event) => {
		if (event.target === el) onclose();
	}}
>
	{#if open}
		<div class="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
			{@render children()}
		</div>
	{/if}
</dialog>
