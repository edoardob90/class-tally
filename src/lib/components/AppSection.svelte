<script lang="ts">
	import { t } from '../i18n';
	import { pwa } from '../state';
</script>

{#if pwa.supported}
	<section class="card grid gap-2" aria-labelledby="app-heading">
		<h2 id="app-heading" class="text-lg font-bold">{t('settings.app.title')}</h2>
		<p>{pwa.offlineReady ? t('settings.app.offlineReady') : t('settings.app.offlineNotReady')}</p>
		{#if pwa.updateReady}
			<p class="font-semibold">{t('settings.app.updateReady')}</p>
			<button type="button" class="btn btn-primary justify-self-start" onclick={() => pwa.apply()}>
				{t('settings.app.apply')}
			</button>
		{/if}
	</section>
{/if}
