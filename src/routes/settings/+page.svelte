<script lang="ts">
	import type { Locale } from '../../lib/domain';
	import { t } from '../../lib/i18n';
	import { app } from '../../lib/state';

	const locales: Locale[] = ['en', 'it'];
</script>

<svelte:head>
	<title>{t('settings.title')} · {t('app.name')}</title>
</svelte:head>

<h1 class="mb-3 text-2xl font-bold">{t('settings.title')}</h1>

<section class="card" aria-labelledby="language-heading">
	<h2 id="language-heading" class="mb-2 font-bold">{t('settings.language')}</h2>
	<div class="grid grid-cols-2 gap-2" role="group" aria-labelledby="language-heading">
		{#each locales as code (code)}
			<button
				type="button"
				class="btn {app.settings?.locale === code ? 'btn-primary' : ''}"
				aria-pressed={app.settings?.locale === code}
				onclick={() => void app.setLocale(code)}
			>
				{t(`settings.languages.${code}`)}
			</button>
		{/each}
	</div>
</section>

<p class="mt-4 text-sm text-muted">{t('settings.about')}</p>
