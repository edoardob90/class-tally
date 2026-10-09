<script lang="ts">
	import { ClipboardListIcon } from '../../lib/components/icons';
	import { actionIcons, categoryIcons } from '../../lib/components/iconMaps';
	import { CheckCheckIcon, CheckIcon, FlagIcon, Undo2Icon } from '../../lib/components/icons';
	import {
		actionLabel,
		categoryLabel,
		dayHeading,
		formatTime,
		levelLetter,
		nameCollator,
		t
	} from '../../lib/i18n';
	import {
		buildTranscribeList,
		clearCheckFlag,
		markTranscribed,
		unmarkTranscribed,
		type SummaryItem
	} from '../../lib/services';
	import { app, toast } from '../../lib/state';

	const list = $derived(buildTranscribeList(app.events, app.classes, app.students, nameCollator()));

	async function mark(ids: string[]) {
		if (!app.repo) return;
		const repo = app.repo;
		try {
			const changed = await markTranscribed(repo, ids);
			if (changed.length === 0) return;
			toast.show({
				text: t('transcribe.marked', { count: changed.length }),
				actions: [
					{
						key: 'undo',
						label: t('toast.undo'),
						icon: Undo2Icon,
						run: async () => {
							await unmarkTranscribed(repo, changed);
							toast.dismiss();
						}
					}
				]
			});
		} catch (error) {
			console.error(error);
			toast.show({ text: t('toast.saveFailed'), tone: 'error' });
		}
	}

	async function checked(id: string) {
		if (app.repo) await clearCheckFlag(app.repo, id);
	}
</script>

{#snippet detail(item: SummaryItem)}
	{@const e = item.event}
	{@const CategoryIcon = categoryIcons[e.category]}
	{@const ActionIcon = actionIcons[e.action]}
	<p class="font-semibold">
		{t('transcribe.item', {
			student: item.student,
			category: categoryLabel(app.category(e.category), t),
			action: actionLabel(e.action, t)
		})}
	</p>
	<p class="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
		<span>{formatTime(e.createdAt)}</span>
		<span class="inline-flex items-center gap-1"><CategoryIcon size={14} /></span>
		<span class="level-{e.action} inline-flex items-center gap-1 rounded-lg border px-1.5">
			<ActionIcon size={14} />
			<span class="text-xs font-bold">{levelLetter(e.action, t)}</span>
		</span>
		<span>{t('history.count', { count: e.countAtCreation })}</span>
	</p>
	{#if e.note}<p class="mt-1 text-sm text-ink">{e.note}</p>{/if}
{/snippet}

<svelte:head>
	<title>{t('transcribe.title')} · {t('app.name')}</title>
</svelte:head>

<h1 class="text-2xl font-bold">{t('transcribe.title')}</h1>
<p class="mb-3 text-sm text-muted">{t('transcribe.pending', { count: list.pending })}</p>

{#if list.pending === 0 && list.flagged.length === 0}
	<div class="card mt-6 text-center">
		<ClipboardListIcon size={36} class="mx-auto text-muted" />
		<p class="mt-2 font-semibold">{t('transcribe.empty')}</p>
	</div>
{/if}

{#if list.flagged.length > 0}
	<section class="mb-4" aria-labelledby="flagged-heading">
		<h2 id="flagged-heading" class="mb-2 flex items-center gap-2 text-lg font-bold text-red-900">
			<FlagIcon size={20} />{t('transcribe.checkRegister')}
		</h2>
		<ul class="grid gap-2">
			{#each list.flagged as item (item.event.id)}
				<li class="rounded-2xl border-2 border-red-500 bg-red-50 p-3">
					{@render detail(item)}
					<p class="mt-1 text-sm font-semibold text-red-900">{t('transcribe.checkRegisterHint')}</p>
					<div class="mt-2 flex justify-end">
						<button type="button" class="btn" onclick={() => checked(item.event.id)}>
							<CheckIcon size={18} />{t('transcribe.checked')}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#each list.classes as cls (cls.classId)}
	<section class="mb-5" aria-labelledby="class-{cls.classId}">
		<div class="mb-2 flex items-center justify-between gap-2">
			<h2 id="class-{cls.classId}" class="text-lg font-bold">{cls.name}</h2>
			<button type="button" class="btn" onclick={() => mark(cls.pendingIds)}>
				<CheckCheckIcon size={18} />{t('transcribe.markAll')}
			</button>
		</div>
		{#each cls.days as day (day.key)}
			<h3 class="mt-3 mb-1 text-sm font-semibold text-muted">{dayHeading(day.key, app.now)}</h3>
			<ul class="grid gap-2">
				{#each day.items as item (item.event.id)}
					<li class="card flex items-center gap-2">
						<div class="min-w-0 flex-1">{@render detail(item)}</div>
						<button
							type="button"
							class="btn shrink-0"
							aria-label="{t('transcribe.markTranscribed')}: {item.student}"
							onclick={() => mark([item.event.id])}
						>
							<CheckIcon size={20} />
						</button>
					</li>
				{/each}
			</ul>
		{/each}
	</section>
{/each}
