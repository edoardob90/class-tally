<script lang="ts">
	import { t } from '../i18n';
	import { app, toast } from '../state';

	let typed = $state('');
	let busy = $state(false);

	const word = $derived(t('settings.delete.word'));
	const matches = $derived(typed.trim().toLocaleLowerCase() === word.toLocaleLowerCase());

	async function wipe() {
		if (!app.repo || !matches) return;
		busy = true;
		try {
			await app.repo.deleteAllData();
			await app.reload();
			typed = '';
			toast.show({ text: t('settings.delete.done'), durationMs: 4000 });
		} catch (error) {
			console.error(error);
			toast.show({ text: t('toast.saveFailed'), tone: 'error' });
		} finally {
			busy = false;
		}
	}
</script>

<section class="card grid gap-2 border-red-300" aria-labelledby="delete-heading">
	<h2 id="delete-heading" class="text-lg font-bold text-red-900">{t('settings.delete.title')}</h2>
	<p class="text-sm text-muted">{t('settings.delete.body')}</p>
	<label class="text-sm font-semibold" for="delete-word">
		{t('settings.delete.typeWord', { word })}
	</label>
	<input
		id="delete-word"
		class="field"
		bind:value={typed}
		autocomplete="off"
		autocapitalize="off"
	/>
	<button
		type="button"
		class="btn btn-danger justify-self-start"
		disabled={!matches || busy}
		onclick={wipe}
	>
		{t('settings.delete.button')}
	</button>
</section>
