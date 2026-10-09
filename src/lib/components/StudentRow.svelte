<script lang="ts">
	import type { Student } from '../domain';
	import { t } from '../i18n';
	import { editStudent } from '../services';
	import { app } from '../state';
	import { EyeIcon, EyeOffIcon, PencilIcon } from './icons';

	let { student }: { student: Student } = $props();

	let editing = $state(false);
	let name = $state('');
	let surname = $state('');
	let sortKey = $state('');
	let error = $state('');

	function startEdit() {
		name = student.name;
		surname = student.surname;
		sortKey = student.sortKey ?? '';
		error = '';
		editing = true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!app.repo) return;
		if (!name.trim() && !surname.trim()) {
			error = t('classes.studentRequired');
			return;
		}
		await editStudent(app.repo, student, { name, surname, sortKey });
		editing = false;
	}

	async function toggleActive() {
		await app.repo?.updateStudent(student.id, { active: !student.active });
	}
</script>

<li class="border-t border-line py-2 first:border-t-0">
	{#if editing}
		<form onsubmit={save} class="grid gap-2">
			<label class="text-sm font-semibold">
				{t('classes.studentName')}
				<input class="field mt-1" bind:value={name} autocomplete="off" />
			</label>
			<label class="text-sm font-semibold">
				{t('classes.studentSurname')}
				<input class="field mt-1" bind:value={surname} autocomplete="off" />
			</label>
			<label class="text-sm font-semibold">
				{t('classes.sortKey')}
				<input class="field mt-1" bind:value={sortKey} autocomplete="off" />
			</label>
			{#if error}<p role="alert" class="text-sm font-semibold text-red-700">{error}</p>{/if}
			<div class="flex justify-end gap-2">
				<button type="button" class="btn" onclick={() => (editing = false)}>
					{t('common.cancel')}
				</button>
				<button type="submit" class="btn btn-primary">{t('common.save')}</button>
			</div>
		</form>
	{:else}
		<div class="flex items-center gap-2">
			<span class="min-w-0 flex-1 truncate font-semibold {student.active ? '' : 'text-muted'}">
				{student.label}
				{#if !student.active}<span class="text-xs font-normal">· {t('classes.hidden')}</span>{/if}
			</span>
			<button type="button" class="btn" aria-label={t('common.edit')} onclick={startEdit}>
				<PencilIcon size={18} />
			</button>
			<button
				type="button"
				class="btn"
				aria-label={student.active ? t('classes.hideStudent') : t('classes.showStudent')}
				onclick={toggleActive}
			>
				{#if student.active}<EyeOffIcon size={18} />{:else}<EyeIcon size={18} />{/if}
			</button>
		</div>
	{/if}
</li>
