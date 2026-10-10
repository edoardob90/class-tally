<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import HintToggle from '../../lib/components/HintToggle.svelte';
	import { ArrowLeftRightIcon, UploadIcon, XIcon } from '../../lib/components/icons';
	import { parseRoster, RosterError, type RosterEntry } from '../../lib/domain';
	import { t } from '../../lib/i18n';
	import { importRoster, planStudents } from '../../lib/services';
	import { app, toast } from '../../lib/state';

	interface Row extends RosterEntry {
		id: number;
	}
	interface Draft {
		key: number;
		name: string;
		/** `new` or the id of an existing class. */
		target: string;
		rows: Row[];
	}

	let text = $state('');
	let error = $state('');
	let drafts = $state<Draft[]>([]);
	let busy = $state(false);
	let rowId = 0;

	const errorKey = {
		'roster.empty': 'import.errors.empty',
		'roster.invalidJson': 'import.errors.invalidJson',
		'roster.noStudents': 'import.errors.noStudents',
		'roster.isBackup': 'import.errors.isBackup'
	} as const;

	function preview() {
		error = '';
		drafts = [];
		try {
			const { classes } = parseRoster(text);
			drafts = classes.map((c, i) => ({
				key: i,
				name: c.name ?? '',
				target: 'new',
				rows: c.entries.map((e) => ({ ...e, id: rowId++ }))
			}));
		} catch (e) {
			error = e instanceof RosterError ? t(errorKey[e.code]) : t('import.errors.failed');
		}
	}

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		text = await file.text();
		preview();
	}

	/** What each draft would add, given the class it goes into. */
	const plans = $derived(
		drafts.map((d) => {
			const existing = d.target === 'new' ? [] : app.students.filter((s) => s.classId === d.target);
			return planStudents(existing, d.rows);
		})
	);

	const total = $derived(plans.reduce((n, p) => n + p.toAdd.length, 0));

	function labelOf(planIndex: number, row: Row): string | undefined {
		return plans[planIndex]?.toAdd.find(
			(s) => s.name === row.name.trim() && s.surname === row.surname.trim()
		)?.label;
	}

	function swap(row: Row) {
		[row.surname, row.name] = [row.name, row.surname];
	}

	async function confirm() {
		if (!app.repo) return;
		if (drafts.some((d) => d.target === 'new' && !d.name.trim())) {
			error = t('import.errors.classNameMissing');
			return;
		}
		busy = true;
		error = '';
		try {
			const summary = await importRoster(
				app.repo,
				drafts.map((d) => ({
					target:
						d.target === 'new'
							? { kind: 'new' as const, name: d.name }
							: { kind: 'existing' as const, classId: d.target },
					entries: d.rows.map(({ surname, name }) => ({ surname, name }))
				}))
			);
			if (summary.classId) await app.selectClass(summary.classId);
			toast.show({
				text: summary.students
					? t('import.done', { count: summary.students })
					: t('import.nothingNew'),
				durationMs: 4000
			});
			await goto(resolve('/'));
		} catch (e) {
			console.error(e);
			error = t('import.errors.failed');
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{t('import.title')} · {t('app.name')}</title>
</svelte:head>

<header class="mb-1 flex items-center justify-between gap-2">
	<h1 class="text-2xl font-bold">{t('import.title')}</h1>
	<HintToggle />
</header>
<p class="mb-3 text-sm text-muted">{t('import.hint')}</p>

<div class="card grid gap-2">
	<label class="text-sm font-semibold" for="roster-text">{t('import.pasteLabel')}</label>
	<textarea id="roster-text" class="field min-h-32 font-mono" bind:value={text}></textarea>
	<div class="flex flex-wrap gap-2">
		<label class="btn">
			<UploadIcon size={18} />{t('import.chooseFile')}
			<input
				type="file"
				accept=".json,application/json,text/plain,.txt"
				class="sr-only"
				onchange={onFile}
			/>
		</label>
		<button type="button" class="btn btn-primary" onclick={preview}>{t('import.preview')}</button>
	</div>
</div>

{#if error}
	<p role="alert" class="mt-3 font-semibold text-red-700">{error}</p>
{/if}

{#each drafts as draft, index (draft.key)}
	<section class="card mt-3">
		<div class="grid gap-2">
			<label class="text-sm font-semibold">
				{t('import.target')}
				<select class="field mt-1" bind:value={draft.target}>
					<option value="new">{t('import.newClass')}</option>
					{#each app.classes as cls (cls.id)}
						<option value={cls.id}>{cls.name}</option>
					{/each}
				</select>
			</label>
			{#if draft.target === 'new'}
				<label class="text-sm font-semibold">
					{t('import.classNameLabel')}
					<input class="field mt-1" bind:value={draft.name} autocomplete="off" />
				</label>
			{/if}
		</div>
		<ul class="mt-3">
			{#each draft.rows as row (row.id)}
				{@const label = labelOf(index, row)}
				<li class="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-1 border-t border-line py-2">
					<input
						class="field"
						aria-label={t('import.surname')}
						bind:value={row.surname}
						autocomplete="off"
					/>
					<input
						class="field"
						aria-label={t('import.name')}
						bind:value={row.name}
						autocomplete="off"
					/>
					<button type="button" class="btn" aria-label={t('import.swap')} onclick={() => swap(row)}>
						<ArrowLeftRightIcon size={18} />
					</button>
					<button
						type="button"
						class="btn"
						aria-label={t('import.removeRow')}
						onclick={() => (draft.rows = draft.rows.filter((r) => r.id !== row.id))}
					>
						<XIcon size={18} />
					</button>
					<p class="col-span-4 text-xs text-muted">
						{#if label}{t('import.label')}: <strong>{label}</strong>{:else}{t(
								'import.alreadyThere'
							)}{/if}
					</p>
				</li>
			{/each}
		</ul>
	</section>
{/each}

{#if drafts.length > 0}
	<div class="mt-4 flex justify-end">
		<button type="button" class="btn btn-primary" disabled={busy || total === 0} onclick={confirm}>
			{t('import.confirm', { count: total })}
		</button>
	</div>
{/if}
