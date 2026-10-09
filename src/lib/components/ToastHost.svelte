<script lang="ts">
	import { quickNotesFor, t } from '../i18n';
	import { logging } from '../state/logging.svelte';
	import { toast } from '../state';
	import { XIcon } from './icons';
	import NoteDialog from './NoteDialog.svelte';

	let clock = $state(Date.now());

	$effect(() => {
		const handle = setInterval(() => {
			clock = Date.now();
			toast.tick(clock);
		}, 200);
		const onVisible = () => {
			if (document.visibilityState === 'visible') {
				clock = Date.now();
				toast.tick(clock);
			}
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(handle);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	const toastItem = $derived(toast.current);
	const remaining = $derived(
		toastItem && !toastItem.paused
			? Math.max(0, Math.min(1, (toastItem.deadline - clock) / toastItem.durationMs))
			: 1
	);
</script>

{#if toastItem}
	<div
		class="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
		style="bottom: calc(var(--height-nav) + env(safe-area-inset-bottom) + 0.5rem)"
	>
		<div
			role="status"
			aria-live="polite"
			class="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl text-white shadow-xl {toastItem.tone ===
			'error'
				? 'bg-red-800'
				: 'bg-slate-900'}"
		>
			<p class="px-4 pt-3 text-sm font-medium">{toastItem.text}</p>
			<div class="flex flex-wrap items-center gap-2 px-3 pt-2 pb-3">
				{#each toastItem.actions as action (action.key)}
					{@const Icon = action.icon}
					<button
						type="button"
						class="btn border-white/30 bg-white/10 text-white"
						onclick={() => void action.run()}
					>
						{#if Icon}<Icon size={18} />{/if}
						{action.label}
					</button>
				{/each}
				<button
					type="button"
					class="btn ml-auto border-transparent bg-transparent text-white"
					aria-label={t('toast.dismiss')}
					onclick={() => toast.dismiss(toastItem.id)}
				>
					<XIcon size={18} />
				</button>
			</div>
			<div class="h-1 bg-white/20">
				<div class="h-full bg-white/80" style="width: {remaining * 100}%"></div>
			</div>
		</div>
	</div>
{/if}

<NoteDialog
	open={logging.noteFor !== null}
	title={logging.noteFor
		? t('note.title', { student: logging.noteFor.student.label })
		: t('common.loading')}
	quick={logging.noteFor ? quickNotesFor(logging.noteFor.category, t) : []}
	onsave={(text) => void logging.saveNote(text)}
	onclose={() => logging.closeNote()}
/>
