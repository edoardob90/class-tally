<script lang="ts">
	import { needsTranscription, type TallyEvent } from '../domain';
	import { actionLabel, categoryLabel, formatDate, formatTime, levelLetter, t } from '../i18n';
	import { app } from '../state';
	import { actionIcons, categoryIcons } from './iconMaps';
	import { BanIcon, CheckIcon, FlagIcon, PencilIcon } from './icons';

	let {
		event,
		student,
		showDate = false,
		onnote,
		onvoid
	}: {
		event: TallyEvent;
		/** Label of the student, shown in class views. */
		student?: string;
		/** Also show the date (student view); otherwise only the time. */
		showDate?: boolean;
		onnote: (event: TallyEvent) => void;
		onvoid: (event: TallyEvent) => void;
	} = $props();

	const cat = $derived(app.category(event.category));
	const CategoryIcon = $derived(categoryIcons[event.category]);
	const ActionIcon = $derived(actionIcons[event.action]);
	const voided = $derived(!!event.voidedAt);
</script>

<li class="card {voided ? 'bg-slate-50' : ''}">
	<div class="flex items-start gap-2">
		<div class="min-w-0 flex-1">
			<div class={voided ? 'line-through opacity-70' : ''}>
				<p class="flex flex-wrap items-center gap-x-2 text-sm text-muted">
					<span>
						{#if showDate}{formatDate(event.createdAt, {
								day: 'numeric',
								month: 'short'
							})}{/if}
						{formatTime(event.createdAt)}
					</span>
					{#if student}<span class="font-semibold text-ink">{student}</span>{/if}
					<span class="inline-flex items-center gap-1">
						<CategoryIcon size={14} />{categoryLabel(cat, t)}
					</span>
				</p>
				<p class="mt-0.5 flex flex-wrap items-center gap-1 font-semibold">
					<span
						class="level-{event.action} inline-flex items-center gap-1 rounded-lg border px-1.5"
					>
						<ActionIcon size={16} />
						{actionLabel(event.action, t)}
						<span class="rounded bg-white/70 px-1 text-xs font-bold">
							{levelLetter(event.action, t)}
						</span>
					</span>
					<span class="text-sm font-normal text-muted">
						{t('history.count', { count: event.countAtCreation })}
					</span>
				</p>
				{#if event.note}
					<p class="mt-1 text-sm">{event.note}</p>
				{/if}
			</div>
			<p class="mt-1.5 flex flex-wrap gap-1 text-xs font-semibold">
				{#if voided}
					<span class="rounded-full border border-line bg-white px-2 py-0.5">
						{t('history.voided')}
					</span>
				{:else if needsTranscription(event)}
					<span class="level-register rounded-full border px-2 py-0.5">
						{t('history.toTranscribe')}
					</span>
				{:else if event.transcribedAt}
					<span
						class="inline-flex items-center gap-1 rounded-full border border-green-600 bg-green-50 px-2 py-0.5 text-green-900"
					>
						<CheckIcon size={12} />{t('history.transcribed')}
					</span>
				{/if}
				{#if event.checkRegister && !voided}
					<span
						class="inline-flex items-center gap-1 rounded-full border border-red-600 bg-red-50 px-2 py-0.5 text-red-900"
					>
						<FlagIcon size={12} />{t('transcribe.checkRegister')}
					</span>
				{/if}
			</p>
		</div>
		{#if !voided}
			<div class="flex shrink-0 gap-1">
				<button
					type="button"
					class="btn"
					aria-label={t('history.editNote')}
					onclick={() => onnote(event)}
				>
					<PencilIcon size={18} />
				</button>
				<button
					type="button"
					class="btn"
					aria-label={t('void.action')}
					onclick={() => onvoid(event)}
				>
					<BanIcon size={18} />
				</button>
			</div>
		{/if}
	</div>
</li>
