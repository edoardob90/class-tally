<script lang="ts">
	import { resolve } from '$app/paths';
	import ClassCard from '../../lib/components/ClassCard.svelte';
	import HintToggle from '../../lib/components/HintToggle.svelte';
	import { PlusIcon, UploadIcon } from '../../lib/components/icons';
	import { t } from '../../lib/i18n';
	import { app } from '../../lib/state';

	let name = $state('');
	let error = $state('');

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (!app.repo) return;
		if (!name.trim()) {
			error = t('classes.nameRequired');
			return;
		}
		const created = await app.repo.createClass({ name });
		await app.selectClass(created.id);
		name = '';
		error = '';
	}
</script>

<svelte:head>
	<title>{t('classes.title')} · {t('app.name')}</title>
</svelte:head>

<header class="mb-3 flex items-center justify-between gap-2">
	<h1 class="text-2xl font-bold">{t('classes.title')}</h1>
	<a class="btn ml-auto" href={resolve('/import')}
		><UploadIcon size={18} />{t('home.importRoster')}</a
	>
	<HintToggle />
</header>

<form onsubmit={create} class="card mb-4 grid gap-2">
	<label class="text-sm font-semibold">
		{t('classes.className')}
		<input class="field mt-1" bind:value={name} autocomplete="off" />
	</label>
	{#if error}<p role="alert" class="text-sm font-semibold text-red-700">{error}</p>{/if}
	<button type="submit" class="btn btn-primary justify-self-end">
		<PlusIcon size={18} />{t('classes.newClass')}
	</button>
</form>

{#if app.classes.length === 0}
	<p class="text-muted">{t('classes.empty')}</p>
{:else}
	<ul class="grid gap-3">
		{#each app.classes as cls (cls.id)}
			<ClassCard {cls} />
		{/each}
	</ul>
{/if}
