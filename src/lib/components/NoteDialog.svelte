<script lang="ts">
	import { LIMITS } from '../domain';
	import { t } from '../i18n';
	import Sheet from './Sheet.svelte';

	let {
		open,
		title,
		initial = '',
		quick,
		onsave,
		onclose
	}: {
		open: boolean;
		title: string;
		/** Text the field starts with (editing an existing note). */
		initial?: string;
		quick: string[];
		onsave: (text: string) => void;
		onclose: () => void;
	} = $props();

	let text = $state('');

	$effect(() => {
		if (open) text = initial;
	});

	function addQuick(phrase: string) {
		const joined = text.trim() ? `${text.trim()}, ${phrase}` : phrase;
		text = joined.slice(0, LIMITS.noteMax);
	}
</script>

<Sheet {open} {onclose} label={title} variant="top">
	<form
		onsubmit={(event) => {
			event.preventDefault();
			onsave(text);
		}}
	>
		<h2 class="text-lg font-bold">{title}</h2>
		<label class="sr-only" for="note-text">{t('note.placeholder')}</label>
		<textarea
			id="note-text"
			class="field mt-2 min-h-24"
			maxlength={LIMITS.noteMax}
			placeholder={t('note.placeholder')}
			bind:value={text}></textarea>
		<p class="mt-1 text-right text-xs text-muted">
			{t('note.counter', { count: text.length, max: LIMITS.noteMax })}
		</p>
		{#if quick.length}
			<p class="mt-1 text-sm font-semibold">{t('note.quick')}</p>
			<div class="mt-1 flex flex-wrap gap-2">
				{#each quick as phrase (phrase)}
					<button type="button" class="btn" onclick={() => addQuick(phrase)}>{phrase}</button>
				{/each}
			</div>
		{/if}
		<div class="mt-4 flex justify-end gap-2">
			<button type="button" class="btn" onclick={onclose}>{t('common.cancel')}</button>
			<button type="submit" class="btn btn-primary">{t('common.save')}</button>
		</div>
	</form>
</Sheet>
