<script lang="ts">
	import type { Action, CategorySettings } from '../domain';
	import { actionLabel, categoryLabel, levelLetter, t } from '../i18n';
	import { categoryIcons } from './iconMaps';

	let {
		cat,
		count,
		next
	}: {
		cat: CategorySettings;
		/** Live count inside the rolling window. */
		count: number;
		/** Action the next event would get. */
		next: Action;
	} = $props();

	const Icon = $derived(categoryIcons[cat.id]);
	const level = $derived(count === 0 ? 'none' : next);
</script>

<span
	role="img"
	aria-label={t('home.badgeAria', {
		category: categoryLabel(cat, t),
		count,
		action: actionLabel(next, t)
	})}
	class="level-{level} inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-sm leading-5"
>
	<Icon size={14} />
	<span class="font-bold tabular-nums">{count}</span>
	{#if count > 0}
		<span class="rounded bg-white/70 px-1 text-xs font-bold">{levelLetter(next, t)}</span>
	{/if}
</span>
