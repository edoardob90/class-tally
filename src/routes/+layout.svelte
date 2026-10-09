<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import NavBar from '../lib/components/NavBar.svelte';
	import ToastHost from '../lib/components/ToastHost.svelte';
	import { t } from '../lib/i18n';
	import { app, pwa } from '../lib/state';
	import { getRepository } from '../lib/storage/browser';

	let { children } = $props();

	onMount(() => {
		void app.init(getRepository());
		void pwa.register();
	});
</script>

<svelte:head>
	<title>{t('app.name')}</title>
</svelte:head>

{#if app.failed}
	<main class="p-6">
		<p role="alert" class="card font-semibold">{t('errors.storage')}</p>
	</main>
{:else if app.ready}
	<main
		class="mx-auto min-h-dvh max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(var(--height-nav)+env(safe-area-inset-bottom)+1.5rem)]"
	>
		{@render children()}
	</main>
	<NavBar />
	<ToastHost />
{/if}
