<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { SchoolClass } from '../domain';
	import { nameCollator, t } from '../i18n';
	import { sortStudents } from '../domain';
	import { addStudent } from '../services';
	import { app } from '../state';
	import {
		ArchiveIcon,
		ArchiveRestoreIcon,
		ChevronDownIcon,
		ChevronRightIcon,
		PencilIcon,
		PlusIcon
	} from './icons';
	import StudentRow from './StudentRow.svelte';

	let { cls }: { cls: SchoolClass } = $props();

	let renaming = $state(false);
	let newName = $state('');
	let renameError = $state('');
	let showStudents = $state(false);
	let addName = $state('');
	let addSurname = $state('');
	let addError = $state('');

	const students = $derived(
		sortStudents(
			app.students.filter((s) => s.classId === cls.id),
			nameCollator()
		)
	);

	function startRename() {
		newName = cls.name;
		renameError = '';
		renaming = true;
	}

	async function saveRename(event: SubmitEvent) {
		event.preventDefault();
		if (!newName.trim()) {
			renameError = t('classes.nameRequired');
			return;
		}
		await app.repo?.updateClass(cls.id, { name: newName });
		renaming = false;
	}

	async function open() {
		await app.selectClass(cls.id);
		await goto(resolve('/'));
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		if (!app.repo) return;
		if (!addName.trim() && !addSurname.trim()) {
			addError = t('classes.studentRequired');
			return;
		}
		await addStudent(app.repo, cls.id, { name: addName, surname: addSurname });
		addName = '';
		addSurname = '';
		addError = '';
	}
</script>

<li class="card">
	{#if renaming}
		<form onsubmit={saveRename} class="grid gap-2">
			<label class="text-sm font-semibold">
				{t('classes.className')}
				<input class="field mt-1" bind:value={newName} autocomplete="off" />
			</label>
			{#if renameError}<p role="alert" class="text-sm font-semibold text-red-700">
					{renameError}
				</p>{/if}
			<div class="flex justify-end gap-2">
				<button type="button" class="btn" onclick={() => (renaming = false)}>
					{t('common.cancel')}
				</button>
				<button type="submit" class="btn btn-primary">{t('common.save')}</button>
			</div>
		</form>
	{:else}
		<div class="flex items-center gap-2">
			<h2 class="min-w-0 flex-1 truncate text-lg font-bold {cls.archived ? 'text-muted' : ''}">
				{cls.name}
				{#if cls.archived}<span class="text-xs font-normal">· {t('classes.archived')}</span>{/if}
			</h2>
			<span class="text-sm text-muted">
				{t('common.students', { count: students.filter((s) => s.active).length })}
			</span>
		</div>
		<div class="mt-2 flex flex-wrap gap-2">
			{#if !cls.archived}
				<button type="button" class="btn btn-primary" onclick={open}>
					{t('classes.openClass')}
				</button>
			{/if}
			<button type="button" class="btn" aria-label={t('classes.rename')} onclick={startRename}>
				<PencilIcon size={18} />
			</button>
			<button
				type="button"
				class="btn"
				aria-label={cls.archived ? t('classes.restore') : t('classes.archive')}
				onclick={() => app.repo?.updateClass(cls.id, { archived: !cls.archived })}
			>
				{#if cls.archived}<ArchiveRestoreIcon size={18} />{:else}<ArchiveIcon size={18} />{/if}
			</button>
			<button
				type="button"
				class="btn ml-auto"
				aria-expanded={showStudents}
				onclick={() => (showStudents = !showStudents)}
			>
				{t('classes.students')}
				{#if showStudents}<ChevronDownIcon size={18} />{:else}<ChevronRightIcon size={18} />{/if}
			</button>
		</div>
	{/if}

	{#if showStudents}
		<ul class="mt-3">
			{#each students as student (student.id)}
				<StudentRow {student} />
			{/each}
		</ul>
		<form onsubmit={add} class="mt-3 grid gap-2 border-t border-line pt-3">
			<div class="grid grid-cols-2 gap-2">
				<label class="text-sm font-semibold">
					{t('classes.studentName')}
					<input class="field mt-1" bind:value={addName} autocomplete="off" />
				</label>
				<label class="text-sm font-semibold">
					{t('classes.studentSurname')}
					<input class="field mt-1" bind:value={addSurname} autocomplete="off" />
				</label>
			</div>
			{#if addError}<p role="alert" class="text-sm font-semibold text-red-700">{addError}</p>{/if}
			<button type="submit" class="btn justify-self-end">
				<PlusIcon size={18} />{t('classes.addStudent')}
			</button>
		</form>
	{/if}
</li>
