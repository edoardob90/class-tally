<script lang="ts">
	import {
		ACTIONS,
		LIMITS,
		defaultCategory,
		validateCategory,
		type Action,
		type CategorySettings,
		type Issue
	} from '../domain';
	import { actionLabel, categoryLabel, locale, quickNotesFor, t, type LooseTFn } from '../i18n';
	import { app, toast } from '../state';
	import { categoryIcons } from './iconMaps';
	import { PlusIcon, XIcon } from './icons';
	import Sheet from './Sheet.svelte';

	let { cat }: { cat: CategorySettings } = $props();

	interface Step {
		from: number | null;
		action: Action;
	}

	let label = $state('');
	let windowDays = $state<number | null>(null);
	let ladder = $state<Step[]>([]);
	let quick = $state<string[]>([]);
	let issues = $state<Issue[]>([]);
	let confirmReset = $state(false);
	let loadedKey = '';

	function load(c: CategorySettings) {
		label = categoryLabel(c, t);
		windowDays = c.windowDays;
		ladder = c.ladder.map((s) => ({ ...s }));
		quick = [...quickNotesFor(c, t)];
		issues = [];
	}

	// Reload the draft when the stored category (or the language) changes, not on every refresh.
	$effect(() => {
		const key = JSON.stringify(cat) + locale.current;
		if (key !== loadedKey) {
			loadedKey = key;
			load(cat);
		}
	});

	const Icon = $derived(categoryIcons[cat.id]);
	const at = (path: string) => issues.filter((i) => i.path === path);
	const message = (issue: Issue) =>
		(t as unknown as LooseTFn)(`settings.issues.${issue.code}`, issue.params);

	async function store(next: CategorySettings) {
		const repo = app.repo;
		const settings = app.settings;
		if (!repo || !settings) return;
		await repo.saveSettings({
			...settings,
			categories: settings.categories.map((c) => (c.id === next.id ? next : c))
		});
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		const labelChanged = label.trim() !== categoryLabel(cat, t);
		const currentNotes = quickNotesFor(cat, t);
		const notes = quick.map((q) => q.trim());
		const notesChanged =
			notes.length !== currentNotes.length || notes.some((n, i) => n !== currentNotes[i]);
		const next: CategorySettings = {
			...cat,
			label: labelChanged ? label.trim() : cat.label,
			labelEdited: cat.labelEdited || labelChanged || undefined,
			windowDays: windowDays ?? Number.NaN,
			ladder: ladder.map((s) => ({ from: s.from ?? Number.NaN, action: s.action })),
			quickNotes: notesChanged ? notes : cat.quickNotes,
			quickNotesEdited: cat.quickNotesEdited || notesChanged || undefined
		};
		if (!next.labelEdited) delete next.labelEdited;
		if (!next.quickNotesEdited) delete next.quickNotesEdited;
		// Validate what the user typed (the label and notes shown), whatever gets stored.
		const found = validateCategory({ ...next, label: label.trim(), quickNotes: notes });
		issues = found;
		if (found.length > 0) return;
		try {
			await store(next);
			toast.show({ text: t('settings.categories.saved'), durationMs: 2000 });
		} catch (error) {
			console.error(error);
			toast.show({ text: t('toast.saveFailed'), tone: 'error' });
		}
	}

	async function reset() {
		confirmReset = false;
		try {
			await store(defaultCategory(cat.id));
			toast.show({ text: t('settings.categories.saved'), durationMs: 2000 });
		} catch (error) {
			console.error(error);
			toast.show({ text: t('toast.saveFailed'), tone: 'error' });
		}
	}
</script>

{#snippet problems(path: string)}
	{#each at(path) as issue (issue.code + issue.path)}
		<p role="alert" class="text-sm font-semibold text-red-700">{message(issue)}</p>
	{/each}
{/snippet}

<details class="card">
	<summary class="flex min-h-11 cursor-pointer items-center gap-2 text-lg font-bold">
		<Icon size={22} />
		{categoryLabel(cat, t)}
		<span class="ml-auto text-sm font-normal text-muted">
			{t('common.days', { count: cat.windowDays })}
		</span>
	</summary>

	<form onsubmit={save} class="mt-3 grid gap-3" novalidate>
		<label class="text-sm font-semibold">
			{t('settings.categories.label')}
			<input class="field mt-1" bind:value={label} autocomplete="off" />
		</label>
		{@render problems('category.label')}

		<label class="text-sm font-semibold">
			{t('settings.categories.window')}
			<input
				class="field mt-1"
				type="number"
				inputmode="numeric"
				min={LIMITS.windowDaysMin}
				max={LIMITS.windowDaysMax}
				bind:value={windowDays}
			/>
		</label>
		{@render problems('category.windowDays')}

		<fieldset class="grid gap-2">
			<legend class="mb-1 text-sm font-semibold">{t('settings.categories.ladder')}</legend>
			{#each ladder as step, i (i)}
				<div class="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2">
					<input
						class="field"
						type="number"
						inputmode="numeric"
						aria-label={t('settings.categories.ladderFrom')}
						bind:value={step.from}
					/>
					<select
						class="field"
						aria-label={t('settings.categories.ladderAction')}
						bind:value={step.action}
					>
						{#each ACTIONS as action (action)}
							<option value={action}>{actionLabel(action, t)}</option>
						{/each}
					</select>
					<button
						type="button"
						class="btn"
						aria-label={t('settings.categories.removeStep')}
						onclick={() => (ladder = ladder.filter((_, n) => n !== i))}
					>
						<XIcon size={18} />
					</button>
				</div>
				{@render problems(`category.ladder[${i}].from`)}
				{@render problems(`category.ladder[${i}].action`)}
			{/each}
			{@render problems('category.ladder')}
			<button
				type="button"
				class="btn justify-self-start"
				onclick={() =>
					(ladder = [
						...ladder,
						{ from: (ladder.at(-1)?.from ?? 0) + 1, action: ladder.at(-1)?.action ?? 'verbal' }
					])}
			>
				<PlusIcon size={18} />{t('settings.categories.addStep')}
			</button>
		</fieldset>

		<fieldset class="grid gap-2">
			<legend class="mb-1 text-sm font-semibold">{t('settings.categories.quickNotes')}</legend>
			{#each quick as _note, i (i)}
				<div class="grid grid-cols-[1fr_auto] items-center gap-2">
					<input
						class="field"
						aria-label={t('settings.categories.quickNote')}
						bind:value={quick[i]}
						autocomplete="off"
					/>
					<button
						type="button"
						class="btn"
						aria-label={t('settings.categories.removeQuickNote')}
						onclick={() => (quick = quick.filter((_, n) => n !== i))}
					>
						<XIcon size={18} />
					</button>
				</div>
				{@render problems(`category.quickNotes[${i}]`)}
			{/each}
			{@render problems('category.quickNotes')}
			<button
				type="button"
				class="btn justify-self-start"
				disabled={quick.length >= LIMITS.quickNotesMax}
				onclick={() => (quick = [...quick, ''])}
			>
				<PlusIcon size={18} />{t('settings.categories.addQuickNote')}
			</button>
		</fieldset>

		<div class="flex flex-wrap justify-between gap-2">
			<button type="button" class="btn" onclick={() => (confirmReset = true)}>
				{t('settings.categories.reset')}
			</button>
			<button type="submit" class="btn btn-primary">{t('settings.categories.save')}</button>
		</div>
	</form>
</details>

<Sheet
	open={confirmReset}
	onclose={() => (confirmReset = false)}
	label={t('settings.categories.resetTitle', { category: categoryLabel(cat, t) })}
>
	<h2 class="text-xl font-bold">
		{t('settings.categories.resetTitle', { category: categoryLabel(cat, t) })}
	</h2>
	<p class="mt-2 text-muted">{t('settings.categories.resetBody')}</p>
	<div class="mt-4 flex justify-end gap-2">
		<button type="button" class="btn" onclick={() => (confirmReset = false)}>
			{t('common.cancel')}
		</button>
		<button type="button" class="btn btn-danger" onclick={reset}>
			{t('settings.categories.resetConfirm')}
		</button>
	</div>
</Sheet>
