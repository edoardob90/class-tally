<script lang="ts">
	import { needsTranscription, type TallyEvent } from '../domain';
	import { formatDate, formatTime, t } from '../i18n';
	import ActionChip from './ActionChip.svelte';
	import CategoryChip from './CategoryChip.svelte';
	import CountBadge from './CountBadge.svelte';
	import Hint from './Hint.svelte';
	import { BanIcon, CheckIcon, ClipboardListIcon, FlagIcon, PencilIcon } from './icons';

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

	const voided = $derived(!!event.voidedAt);
</script>

<li class="card {voided ? 'bg-slate-50' : ''}">
	<div class="flex items-start gap-2">
		<div class="min-w-0 flex-1">
			<div class={voided ? 'line-through opacity-60' : ''}>
				{#if student}
					<p class="text-lg leading-tight font-bold">{student}</p>
				{/if}
				<p class="text-sm text-muted">
					{#if showDate}{formatDate(event.createdAt, { day: 'numeric', month: 'short' })}{/if}
					{formatTime(event.createdAt)}
				</p>
				<p class="mt-1.5 flex flex-wrap items-center gap-1.5">
					<CategoryChip category={event.category} />
					<ActionChip action={event.action} />
					<CountBadge count={event.countAtCreation} />
				</p>
				{#if event.note}
					<p class="mt-2 border-l-4 border-line pl-2 text-sm">{event.note}</p>
				{/if}
			</div>
			<p class="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
				{#if voided}
					<span class="rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5">
						{t('history.voided')}
					</span>
				{:else if needsTranscription(event)}
					<span
						class="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-indigo-500 bg-indigo-50 px-2 py-0.5 text-indigo-900"
					>
						<ClipboardListIcon size={12} />{t('history.toTranscribe')}
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
				<Hint text={t('hints.editNote')} align="end">
					<button
						type="button"
						class="btn"
						aria-label={t('history.editNote')}
						onclick={() => onnote(event)}
					>
						<PencilIcon size={18} />
					</button>
				</Hint>
				<Hint text={t('hints.void')} align="end">
					<button
						type="button"
						class="btn"
						aria-label={t('void.action')}
						onclick={() => onvoid(event)}
					>
						<BanIcon size={18} />
					</button>
				</Hint>
			</div>
		{/if}
	</div>
</li>
