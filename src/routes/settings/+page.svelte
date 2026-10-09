<script lang="ts">
	import AppSection from '../../lib/components/AppSection.svelte';
	import BackupSection from '../../lib/components/BackupSection.svelte';
	import CategoryEditor from '../../lib/components/CategoryEditor.svelte';
	import DeleteSection from '../../lib/components/DeleteSection.svelte';
	import HintToggle from '../../lib/components/HintToggle.svelte';
	import StorageSection from '../../lib/components/StorageSection.svelte';
	import type { Locale } from '../../lib/domain';
	import { t } from '../../lib/i18n';
	import { app } from '../../lib/state';

	const locales: Locale[] = ['en', 'it'];
</script>

<svelte:head>
	<title>{t('settings.title')} · {t('app.name')}</title>
</svelte:head>

<header class="mb-3 flex items-center justify-between gap-2">
	<h1 class="text-2xl font-bold">{t('settings.title')}</h1>
	<HintToggle />
</header>

<div class="grid gap-4">
	<section class="card" aria-labelledby="language-heading">
		<h2 id="language-heading" class="mb-2 text-lg font-bold">{t('settings.language')}</h2>
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

	<section aria-labelledby="categories-heading">
		<h2 id="categories-heading" class="text-lg font-bold">{t('settings.categories.title')}</h2>
		<p class="mb-2 text-sm text-muted">{t('settings.categories.hint')}</p>
		<div class="grid gap-2">
			{#each app.categories as cat (cat.id)}
				<CategoryEditor {cat} />
			{/each}
		</div>
	</section>

	<AppSection />
	<BackupSection />
	<StorageSection />
	<DeleteSection />

	<p class="text-sm text-muted">{t('settings.about')}</p>
</div>
