<script lang="ts">
	import { resolve } from '$app/paths';
	import { t } from '../i18n';
	import { app } from '../state';
	import { CheckIcon, ChevronDownIcon, UploadIcon, UsersIcon, XIcon } from './icons';
	import Sheet from './Sheet.svelte';

	let open = $state(false);

	async function pick(classId: string) {
		open = false;
		await app.selectClass(classId);
	}
</script>

<button
	type="button"
	class="btn max-w-full text-lg"
	aria-haspopup="dialog"
	onclick={() => (open = true)}
>
	<span class="truncate">{app.currentClass?.name}</span>
	<span class="sr-only">{t('home.switchClass')}</span>
	<ChevronDownIcon size={20} />
</button>

<Sheet {open} onclose={() => (open = false)} label={t('home.switchClass')}>
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-bold">{t('home.switchClass')}</h2>
		<button type="button" class="btn" aria-label={t('common.close')} onclick={() => (open = false)}>
			<XIcon size={20} />
		</button>
	</div>
	<ul class="mt-3 grid gap-2">
		{#each app.activeClasses as cls (cls.id)}
			<li>
				<button
					type="button"
					class="btn w-full justify-between text-lg {cls.id === app.currentClass?.id
						? 'border-accent bg-blue-50'
						: ''}"
					onclick={() => pick(cls.id)}
				>
					<span class="truncate">{cls.name}</span>
					<span class="flex items-center gap-2 text-sm font-normal text-muted">
						{t('common.students', {
							count: app.students.filter((s) => s.classId === cls.id && s.active).length
						})}
						{#if cls.id === app.currentClass?.id}<CheckIcon size={18} />{/if}
					</span>
				</button>
			</li>
		{/each}
	</ul>
	<div class="mt-3 flex flex-wrap gap-2">
		<a class="btn" href={resolve('/classes')}><UsersIcon size={18} />{t('home.manageClasses')}</a>
		<a class="btn" href={resolve('/import')}><UploadIcon size={18} />{t('home.importRoster')}</a>
	</div>
</Sheet>
