<script lang="ts">
	import type { TallyEvent } from '../domain';
	import { actionLabel, categoryLabel, t } from '../i18n';
	import { app } from '../state';
	import Sheet from './Sheet.svelte';

	let {
		event,
		student,
		onconfirm,
		onclose
	}: {
		event: TallyEvent | null;
		student: string;
		onconfirm: (event: TallyEvent) => void;
		onclose: () => void;
	} = $props();

	let shown = $state.raw<TallyEvent | null>(null);
	$effect(() => {
		if (event) shown = event;
	});
</script>

<Sheet open={event !== null} {onclose} label={t('void.title')}>
	{#if shown}
		<h2 class="text-xl font-bold">{t('void.title')}</h2>
		<p class="mt-1 font-semibold">
			{t('transcribe.item', {
				student,
				category: categoryLabel(app.category(shown.category), t),
				action: actionLabel(shown.action, t)
			})}
		</p>
		<p class="mt-2 text-muted">{t('void.body')}</p>
		{#if shown.transcribedAt}
			<p role="alert" class="mt-2 font-semibold text-red-800">{t('void.transcribedWarning')}</p>
		{/if}
		<div class="mt-4 flex justify-end gap-2">
			<button type="button" class="btn" onclick={onclose}>{t('common.cancel')}</button>
			<button type="button" class="btn btn-danger" onclick={() => onconfirm(shown!)}>
				{t('void.confirm')}
			</button>
		</div>
	{/if}
</Sheet>
