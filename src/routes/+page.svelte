<script lang="ts">
	import { resolve } from '$app/paths';
	import CategorySheet from '../lib/components/CategorySheet.svelte';
	import ClassSwitcher from '../lib/components/ClassSwitcher.svelte';
	import Hint from '../lib/components/Hint.svelte';
	import HintToggle from '../lib/components/HintToggle.svelte';
	import { DownloadIcon, PlusIcon, UploadIcon, UsersIcon, XIcon } from '../lib/components/icons';
	import StudentGrid from '../lib/components/StudentGrid.svelte';
	import type { CategoryId, Student } from '../lib/domain';
	import { t } from '../lib/i18n';
	import { app } from '../lib/state';
	import { logging } from '../lib/state/logging.svelte';

	let sheetStudent = $state.raw<Student | null>(null);

	function logFor(category: CategoryId) {
		const student = sheetStudent;
		sheetStudent = null;
		if (student) logging.log(student, category);
	}
</script>

<svelte:head>
	<title>{t('nav.classView')} · {t('app.name')}</title>
</svelte:head>

{#if app.backup?.due && !app.backupDismissed}
	<div class="card mb-3 flex items-center gap-2 border-amber-400 bg-amber-50" role="status">
		<p class="min-w-0 flex-1 text-sm font-semibold">
			{app.backup.never
				? t('home.backupNever')
				: t('home.backupOld', { age: t('common.days', { count: app.backup.daysSince ?? 0 }) })}
		</p>
		<a class="btn" href={resolve('/settings')}><DownloadIcon size={18} />{t('home.backupAction')}</a
		>
		<button
			type="button"
			class="btn"
			aria-label={t('toast.dismiss')}
			onclick={() => (app.backupDismissed = true)}
		>
			<XIcon size={18} />
		</button>
	</div>
{/if}

{#if app.currentClass}
	<header class="mb-3 flex items-center gap-2">
		<Hint text={t('hints.switchClass')} align="start" class="min-w-0">
			<ClassSwitcher />
		</Hint>
		<span class="ml-auto text-sm text-muted">
			{t('common.students', { count: app.currentStudents.length })}
		</span>
		<HintToggle />
	</header>

	{#if app.currentStudents.length === 0}
		<div class="card text-center">
			<p class="font-semibold">{t('home.noStudents')}</p>
			<div class="mt-3 flex flex-wrap justify-center gap-2">
				<a class="btn btn-primary" href={resolve('/import')}>
					<UploadIcon size={18} />{t('home.importRoster')}
				</a>
				<a class="btn" href={resolve('/classes')}>
					<UsersIcon size={18} />{t('home.manageClasses')}
				</a>
			</div>
		</div>
	{:else}
		<Hint text={t('hints.grid')} />
		<StudentGrid students={app.currentStudents} onpick={(student) => (sheetStudent = student)} />
	{/if}

	<CategorySheet student={sheetStudent} onlog={logFor} onclose={() => (sheetStudent = null)} />
{:else}
	<div class="flex justify-end"><HintToggle /></div>
	<div class="card mt-4 text-center">
		<h1 class="text-xl font-bold">{t('home.noClasses.title')}</h1>
		<p class="mt-1 text-muted">{t('home.noClasses.body')}</p>
		<div class="mt-4 flex flex-wrap justify-center gap-2">
			<a class="btn btn-primary" href={resolve('/import')}>
				<UploadIcon size={18} />{t('home.importRoster')}
			</a>
			<a class="btn" href={resolve('/classes')}>
				<PlusIcon size={18} />{t('home.newClass')}
			</a>
		</div>
	</div>
{/if}
