<script lang="ts">
	import type { Snippet } from 'svelte';
	import { hints } from '../state';

	let {
		text,
		place = 'below',
		align = 'center',
		class: className = '',
		children
	}: {
		text: string;
		/** Where the desktop tooltip opens; use `above` near the bottom of the screen. */
		place?: 'below' | 'above';
		/** Which edge of the control the desktop tooltip lines up with; keeps it on screen. */
		align?: 'start' | 'center' | 'end';
		/** Layout classes for the wrapper (e.g. `w-full`), only applied while hints are on. */
		class?: string;
		/** The control the hint explains. Without one, the hint is a short note on its own line. */
		children?: Snippet;
	} = $props();
</script>

{#if !children}
	{#if hints.on}<p class="hint-note">{text}</p>{/if}
{:else if hints.on}
	<!-- Touch screens: a small caption under the control. Mouse: a tooltip on hover and focus. -->
	<span class="hint-wrap {className}">
		{@render children()}
		<span class="hint hint-{place} hint-{align}">{text}</span>
	</span>
{:else}
	{@render children()}
{/if}
