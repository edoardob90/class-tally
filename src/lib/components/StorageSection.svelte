<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '../i18n';
	import { getPersistence, requestPersistence, type PersistenceState } from '../storage';

	let persistence = $state<PersistenceState | null>(null);
	let outcome = $state<'granted' | 'denied' | null>(null);

	onMount(async () => {
		persistence = await getPersistence();
	});

	async function ask() {
		const granted = await requestPersistence();
		persistence = await getPersistence();
		outcome = granted ? 'granted' : 'denied';
	}
</script>

<section class="card grid gap-2" aria-labelledby="storage-heading">
	<h2 id="storage-heading" class="text-lg font-bold">{t('settings.storage.title')}</h2>
	{#if persistence === 'persisted'}
		<p>{t('settings.storage.persisted')}</p>
	{:else if persistence === 'not-persisted'}
		<p>{t('settings.storage.notPersisted')}</p>
		<button type="button" class="btn justify-self-start" onclick={ask}>
			{t('settings.storage.request')}
		</button>
	{:else if persistence === 'unsupported'}
		<p>{t('settings.storage.unsupported')}</p>
	{/if}
	{#if outcome === 'granted'}
		<p class="text-sm font-semibold text-green-800">{t('settings.storage.granted')}</p>
	{:else if outcome === 'denied'}
		<p class="text-sm font-semibold text-red-700">{t('settings.storage.denied')}</p>
	{/if}
</section>
