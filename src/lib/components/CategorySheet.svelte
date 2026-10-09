<script lang="ts">
	import { LIMITS, previewNext, type CategoryId, type Student } from '../domain';
	import { actionLabel, categoryLabel, t } from '../i18n';
	import { app } from '../state';
	import ActionChip from './ActionChip.svelte';
	import { categoryIcons } from './iconMaps';
	import { XIcon } from './icons';
	import Sheet from './Sheet.svelte';

	let {
		student,
		onlog,
		onclose
	}: {
		student: Student | null;
		onlog: (category: CategoryId) => void;
		onclose: () => void;
	} = $props();

	// Keep the last student while the sheet closes so the title does not flicker.
	let shown = $state.raw<Student | null>(null);
	$effect(() => {
		if (student) shown = student;
	});
</script>

<Sheet
	open={student !== null}
	{onclose}
	label={shown ? t('sheet.title', { student: shown.label }) : t('common.loading')}
>
	{#if shown}
		<div class="flex items-center justify-between gap-2">
			<h2 class="truncate text-xl font-bold">{shown.label}</h2>
			<button type="button" class="btn" aria-label={t('common.close')} onclick={onclose}>
				<XIcon size={20} />
			</button>
		</div>
		<div class="mt-3 grid gap-2">
			{#each app.categories as cat (cat.id)}
				{@const events = app.studentEvents(shown.id)}
				{@const next = previewNext(events, shown.id, cat, app.now)}
				{@const CategoryIcon = categoryIcons[cat.id]}
				<button
					type="button"
					class="cat-card cat-{cat.id} flex min-h-[4.75rem] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left"
					aria-label={t('sheet.next', {
						category: categoryLabel(cat, t),
						action: actionLabel(next.action, t)
					})}
					onclick={() => onlog(cat.id)}
				>
					<CategoryIcon size={30} />
					<span class="min-w-0 flex-1">
						<span class="block truncate text-lg font-bold">{categoryLabel(cat, t)}</span>
						<span class="mt-1 flex items-center gap-2 text-sm font-semibold">
							{t('sheet.nextLabel')}
							<ActionChip action={next.action} />
						</span>
						<span class="block text-xs">
							{t('sheet.inWindow', {
								count: next.count - 1,
								window: t('common.days', { count: Math.min(cat.windowDays, LIMITS.windowDaysMax) })
							})}
						</span>
					</span>
				</button>
			{/each}
		</div>
	{/if}
</Sheet>
