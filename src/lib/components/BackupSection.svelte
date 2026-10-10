<script lang="ts">
	import { LIMITS } from '../domain';
	import { formatDate, locale, t, type LooseTFn } from '../i18n';
	import {
		applyBackup,
		createBackupFile,
		createCsvFile,
		markExported,
		previewBackup,
		type ImportPreview
	} from '../services';
	import { deliverFile } from '../share';
	import { app, toast } from '../state';
	import { BackupError, type ImportMode, type ImportReport } from '../storage';
	import Hint from './Hint.svelte';
	import { DownloadIcon, UploadIcon } from './icons';

	// Follows the stored setting; typing in the field overrides it until the next change.
	let interval = $derived<number | null>(app.settings?.backupReminderDays ?? null);
	let intervalError = $state(false);
	let preview = $state.raw<ImportPreview | null>(null);
	let mode = $state<ImportMode>('merge');
	let importError = $state('');
	let busy = $state(false);

	const errorKey = {
		'backup.notJson': 'settings.backup.errors.notJson',
		'backup.badFormat': 'settings.backup.errors.badFormat',
		'backup.newerSchema': 'settings.backup.errors.newerSchema',
		'backup.invalid': 'settings.backup.errors.invalid',
		'backup.integrity': 'settings.backup.errors.integrity'
	} as const;

	const totals = (r: ImportReport) => ({
		added: r.classes.added + r.students.added + r.events.added,
		updated: r.classes.updated + r.students.updated + r.events.updated,
		removed: r.classes.removed + r.students.removed + r.events.removed
	});

	const lastExport = $derived(
		app.settings?.lastExportAt
			? t('settings.backup.lastExport', {
					date: formatDate(app.settings.lastExportAt, {
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})
				})
			: t('settings.backup.never')
	);

	async function saveInterval() {
		const settings = app.settings;
		const n = interval;
		intervalError = !(
			n !== null &&
			Number.isInteger(n) &&
			n >= 0 &&
			n <= LIMITS.backupReminderDaysMax
		);
		if (intervalError || !app.repo || !settings || n === null) return;
		if (n !== settings.backupReminderDays) {
			await app.repo.saveSettings({ ...settings, backupReminderDays: n });
		}
	}

	async function exportJson() {
		if (!app.repo) return;
		try {
			const result = await deliverFile(await createBackupFile(app.repo));
			if (result !== 'cancelled') {
				await markExported(app.repo);
				toast.show({ text: t('settings.backup.exported'), durationMs: 3000 });
			}
		} catch (error) {
			console.error(error);
			toast.show({ text: t('settings.backup.exportFailed'), tone: 'error' });
		}
	}

	async function exportCsv() {
		if (!app.repo) return;
		try {
			const result = await deliverFile(await createCsvFile(app.repo));
			if (result !== 'cancelled') {
				toast.show({ text: t('settings.backup.exported'), durationMs: 3000 });
			}
		} catch (error) {
			console.error(error);
			toast.show({ text: t('settings.backup.exportFailed'), tone: 'error' });
		}
	}

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		preview = null;
		importError = '';
		if (!file || !app.repo) return;
		try {
			preview = await previewBackup(app.repo, await file.text());
			mode = 'merge';
		} catch (error) {
			importError =
				error instanceof BackupError ? t(errorKey[error.code]) : t('settings.backup.errors.failed');
		}
		input.value = '';
	}

	async function runImport() {
		if (!app.repo || !preview) return;
		busy = true;
		try {
			const report = await applyBackup(app.repo, preview.backup, mode);
			await app.reload();
			if (app.settings) locale.set(app.settings.locale);
			preview = null;
			toast.show({ text: t('settings.backup.done', totals(report)), durationMs: 6000 });
		} catch (error) {
			console.error(error);
			importError = t('settings.backup.errors.failed');
		} finally {
			busy = false;
		}
	}

	const plan = $derived(
		preview ? totals(mode === 'merge' ? preview.merge : preview.replace) : null
	);
	const loose = $derived(t as unknown as LooseTFn);
</script>

<section class="card grid gap-3" aria-labelledby="backup-heading">
	<h2 id="backup-heading" class="text-lg font-bold">{t('settings.backup.title')}</h2>

	<div class="grid gap-1">
		<label class="text-sm font-semibold" for="backup-interval"
			>{t('settings.backup.interval')}</label
		>
		<input
			id="backup-interval"
			class="field"
			type="number"
			inputmode="numeric"
			min="0"
			max={LIMITS.backupReminderDaysMax}
			bind:value={interval}
			onchange={saveInterval}
		/>
		<p class="text-xs text-muted">{t('settings.backup.intervalHelp')}</p>
		{#if intervalError}
			<p role="alert" class="text-sm font-semibold text-red-700">
				{loose('settings.issues.backup.interval', { max: LIMITS.backupReminderDaysMax })}
			</p>
		{/if}
	</div>

	<p class="text-sm text-muted">{lastExport}</p>

	<div class="flex flex-wrap gap-2">
		<Hint text={t('hints.exportJson')} align="start">
			<button type="button" class="btn btn-primary" onclick={exportJson}>
				<DownloadIcon size={18} />{t('settings.backup.exportJson')}
			</button>
		</Hint>
		<Hint text={t('hints.exportCsv')} align="start">
			<button type="button" class="btn" onclick={exportCsv}>
				<DownloadIcon size={18} />{t('settings.backup.exportCsv')}
			</button>
		</Hint>
	</div>

	<div class="grid gap-2 border-t border-line pt-3">
		<h3 class="font-bold">{t('settings.backup.importTitle')}</h3>
		<label class="btn justify-self-start">
			<UploadIcon size={18} />{t('settings.backup.chooseFile')}
			<input
				type="file"
				accept=".json,application/json"
				class="sr-only"
				data-testid="backup-file"
				onchange={onFile}
			/>
		</label>
		{#if importError}
			<p role="alert" class="font-semibold text-red-700">{importError}</p>
		{/if}

		{#if preview && plan}
			<p class="text-sm">
				{t('settings.backup.contents', {
					date: formatDate(preview.backup.exportedAt, {
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					}),
					classes: t('common.classes', { count: preview.backup.data.classes.length }),
					students: t('common.students', { count: preview.backup.data.students.length }),
					events: t('common.events', { count: preview.backup.data.events.length })
				})}
			</p>
			<fieldset class="grid gap-2">
				<legend class="mb-1 text-sm font-semibold">{t('settings.backup.modeLabel')}</legend>
				<label class="card flex items-start gap-2">
					<input type="radio" name="import-mode" value="merge" bind:group={mode} class="mt-1" />
					<span>
						<span class="block font-semibold">{t('settings.backup.merge')}</span>
						<span class="block text-sm text-muted">{t('settings.backup.mergeHelp')}</span>
					</span>
				</label>
				<label class="card flex items-start gap-2">
					<input type="radio" name="import-mode" value="replace" bind:group={mode} class="mt-1" />
					<span>
						<span class="block font-semibold">{t('settings.backup.replace')}</span>
						<span class="block text-sm text-muted">{t('settings.backup.replaceHelp')}</span>
					</span>
				</label>
			</fieldset>
			<p class="text-sm font-semibold">{t('settings.backup.willChange', plan)}</p>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn" onclick={() => (preview = null)}>
					{t('common.cancel')}
				</button>
				<button
					type="button"
					class="btn {mode === 'replace' ? 'btn-danger' : 'btn-primary'}"
					disabled={busy}
					onclick={runImport}
				>
					{mode === 'replace'
						? t('settings.backup.importReplace')
						: t('settings.backup.importMerge')}
				</button>
			</div>
		{/if}
	</div>
</section>
