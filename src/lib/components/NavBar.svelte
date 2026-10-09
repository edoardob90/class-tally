<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { t } from '../i18n';
	import { app, pwa } from '../state';
	import { CalendarClockIcon, ClipboardListIcon, SettingsIcon, UsersIcon } from './icons';

	const items = [
		{ path: '/', key: 'nav.classView', icon: UsersIcon },
		{ path: '/transcribe', key: 'nav.toTranscribe', icon: ClipboardListIcon },
		{ path: '/history', key: 'nav.history', icon: CalendarClockIcon },
		{ path: '/settings', key: 'nav.settings', icon: SettingsIcon }
	] as const;

	const here = $derived(page.url.pathname);

	function active(path: string): boolean {
		const target = resolve(path as '/');
		return path === '/' ? here === target : here.startsWith(target);
	}
</script>

<nav
	aria-label={t('nav.label')}
	class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
>
	<ul class="mx-auto flex h-nav max-w-2xl">
		{#each items as item (item.path)}
			{@const Icon = item.icon}
			<li class="flex-1">
				<a
					href={resolve(item.path as '/')}
					aria-current={active(item.path) ? 'page' : undefined}
					class="relative flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold {active(
						item.path
					)
						? 'text-accent'
						: 'text-muted'}"
				>
					<Icon size={24} />
					<span>{t(item.key)}</span>
					{#if item.path === '/settings' && pwa.updateReady}
						<span
							class="absolute top-2 left-1/2 ml-3 size-3 rounded-full bg-red-700"
							role="img"
							aria-label={t('nav.update')}
						></span>
					{/if}
					{#if item.path === '/transcribe' && app.pendingCount > 0}
						<span
							class="absolute top-1.5 left-1/2 ml-2 min-w-5 rounded-full bg-red-700 px-1.5 text-center text-xs leading-5 font-bold text-white"
							role="img"
							aria-label={t('nav.badge', { count: app.pendingCount })}
						>
							{app.pendingCount}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</nav>
