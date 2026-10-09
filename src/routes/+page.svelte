<script lang="ts">
	import { resolve } from '$app/paths';
	import CategorySheet from '../lib/components/CategorySheet.svelte';
	import ClassSwitcher from '../lib/components/ClassSwitcher.svelte';
	import { PlusIcon, UploadIcon, UsersIcon } from '../lib/components/icons';
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

{#if app.currentClass}
	<header class="mb-3 flex items-center justify-between gap-2">
		<ClassSwitcher />
		<span class="text-sm text-muted">
			{t('common.students', { count: app.currentStudents.length })}
		</span>
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
		<StudentGrid students={app.currentStudents} onpick={(student) => (sheetStudent = student)} />
	{/if}

	<CategorySheet student={sheetStudent} onlog={logFor} onclose={() => (sheetStudent = null)} />
{:else}
	<div class="card mt-8 text-center">
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
