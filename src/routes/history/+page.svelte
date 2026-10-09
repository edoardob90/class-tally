<script lang="ts">
	import { page } from '$app/state';
	import EventRow from '../../lib/components/EventRow.svelte';
	import NoteDialog from '../../lib/components/NoteDialog.svelte';
	import VoidDialog from '../../lib/components/VoidDialog.svelte';
	import {
		addDaysToKey,
		compareEvents,
		dayKey,
		dayRangeBounds,
		isDayKey,
		sortStudents,
		type TallyEvent
	} from '../../lib/domain';
	import { categoryLabel, dayHeading, nameCollator, quickNotesFor, t } from '../../lib/i18n';
	import { groupByDay, setEventNote, voidEvent } from '../../lib/services';
	import { app, toast, ui } from '../../lib/state';

	const today = dayKey(Date.now());
	const initialStudent = page.url.searchParams.get('student');
	const startStudent = app.students.find((s) => s.id === initialStudent);

	// Filters live in the session UI store so they survive switching tabs. A student link wins.
	const f = ui.history;
	if (startStudent) {
		f.mode = 'student';
		f.classId = startStudent.classId;
		f.studentId = startStudent.id;
	} else if (!app.classes.some((c) => c.id === f.classId)) {
		f.classId = app.currentClass?.id ?? app.classes[0]?.id ?? '';
	}
	if (!f.rangeSet) {
		f.fromKey = addDaysToKey(today, -6);
		f.toKey = today;
	}

	let voidTarget = $state.raw<TallyEvent | null>(null);
	let noteTarget = $state.raw<TallyEvent | null>(null);

	const labelOf = (id: string) => app.students.find((s) => s.id === id)?.label ?? '';

	// Students of the class, including hidden ones: their history stays reachable.
	const classStudents = $derived(
		sortStudents(
			app.students.filter((s) => s.classId === f.classId),
			nameCollator()
		)
	);
	const validStudent = $derived(classStudents.some((s) => s.id === f.studentId) ? f.studentId : '');

	const studentGroups = $derived.by(() => {
		if (!validStudent) return [];
		const events = app.events.filter((e) => e.studentId === validStudent);
		return app.categories
			.filter((c) => f.category === 'all' || c.id === f.category)
			.map((cat) => ({
				cat,
				events: events.filter((e) => e.category === cat.id).sort((a, b) => compareEvents(b, a))
			}))
			.filter((g) => g.events.length > 0);
	});

	const classDays = $derived.by(() => {
		if (!isDayKey(f.fromKey) || !isDayKey(f.toKey)) return [];
		const { from, to } = dayRangeBounds(f.fromKey, f.toKey);
		const events = app.events
			.filter((e) => e.classId === f.classId)
			.filter((e) => f.category === 'all' || e.category === f.category)
			.filter((e) => {
				const at = Date.parse(e.createdAt);
				return at >= from && at < to;
			})
			.sort((a, b) => compareEvents(b, a));
		return groupByDay(events, (e) => e.createdAt);
	});

	function preset(days: number) {
		f.toKey = today;
		f.fromKey = addDaysToKey(today, -(days - 1));
		f.rangeSet = true;
	}

	async function confirmVoid(event: TallyEvent) {
		voidTarget = null;
		if (!app.repo) return;
		try {
			const result = await voidEvent(app.repo, event.id);
			if (!result) return;
			toast.show({
				text: result.recomputed
					? `${t('void.done')}. ${t('void.recomputed', { count: result.recomputed })}`
					: t('void.done'),
				durationMs: 5000
			});
		} catch (error) {
			console.error(error);
			toast.show({ text: t('toast.saveFailed'), tone: 'error' });
		}
	}

	async function saveNote(text: string) {
		const target = noteTarget;
		noteTarget = null;
		if (!target || !app.repo) return;
		try {
			await setEventNote(app.repo, target.id, text);
		} catch (error) {
			console.error(error);
			toast.show({ text: t('toast.saveFailed'), tone: 'error' });
		}
	}
</script>

<svelte:head>
	<title>{t('history.title')} · {t('app.name')}</title>
</svelte:head>

<h1 class="mb-3 text-2xl font-bold">{t('history.title')}</h1>

{#if app.classes.length === 0}
	<p class="text-muted">{t('classes.empty')}</p>
{:else}
	<div class="mb-3 grid grid-cols-2 gap-2" role="group" aria-label={t('history.title')}>
		<button
			type="button"
			class="btn {f.mode === 'student' ? 'btn-primary' : ''}"
			aria-pressed={f.mode === 'student'}
			onclick={() => (f.mode = 'student')}
		>
			{t('history.byStudent')}
		</button>
		<button
			type="button"
			class="btn {f.mode === 'class' ? 'btn-primary' : ''}"
			aria-pressed={f.mode === 'class'}
			onclick={() => (f.mode = 'class')}
		>
			{t('history.byClass')}
		</button>
	</div>

	<div class="card mb-4 grid gap-2">
		<label class="text-sm font-semibold">
			{t('history.class')}
			<select class="field mt-1" bind:value={f.classId}>
				{#each app.classes as cls (cls.id)}
					<option value={cls.id}>{cls.name}</option>
				{/each}
			</select>
		</label>

		{#if f.mode === 'student'}
			<label class="text-sm font-semibold">
				{t('history.student')}
				<select class="field mt-1" bind:value={f.studentId}>
					<option value="">{t('history.pickStudent')}</option>
					{#each classStudents as student (student.id)}
						<option value={student.id}>{student.label}</option>
					{/each}
				</select>
			</label>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				<label class="text-sm font-semibold">
					{t('history.from')}
					<input
						type="date"
						class="field mt-1"
						bind:value={f.fromKey}
						onchange={() => (f.rangeSet = true)}
					/>
				</label>
				<label class="text-sm font-semibold">
					{t('history.to')}
					<input
						type="date"
						class="field mt-1"
						bind:value={f.toKey}
						onchange={() => (f.rangeSet = true)}
					/>
				</label>
			</div>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="btn" onclick={() => preset(7)}>{t('history.last7')}</button>
				<button type="button" class="btn" onclick={() => preset(30)}>{t('history.last30')}</button>
			</div>
		{/if}

		<label class="text-sm font-semibold">
			{t('history.category')}
			<select class="field mt-1" bind:value={f.category}>
				<option value="all">{t('history.allCategories')}</option>
				{#each app.categories as cat (cat.id)}
					<option value={cat.id}>{categoryLabel(cat, t)}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if f.mode === 'student'}
		{#if !validStudent}
			<p class="text-muted">{t('history.pickStudent')}</p>
		{:else if studentGroups.length === 0}
			<p class="text-muted">{t('history.empty')}</p>
		{:else}
			{#each studentGroups as group (group.cat.id)}
				<section class="mb-4" aria-label={categoryLabel(group.cat, t)}>
					<h2 class="mb-2 text-lg font-bold">{categoryLabel(group.cat, t)}</h2>
					<ul class="grid gap-2">
						{#each group.events as event (event.id)}
							<EventRow
								{event}
								showDate
								onnote={(e) => (noteTarget = e)}
								onvoid={(e) => (voidTarget = e)}
							/>
						{/each}
					</ul>
				</section>
			{/each}
		{/if}
	{:else if classDays.length === 0}
		<p class="text-muted">{t('history.empty')}</p>
	{:else}
		{#each classDays as day (day.key)}
			<section class="mb-4" aria-label={dayHeading(day.key, app.now)}>
				<h2 class="mb-2 text-sm font-semibold text-muted">{dayHeading(day.key, app.now)}</h2>
				<ul class="grid gap-2">
					{#each day.items as event (event.id)}
						<EventRow
							{event}
							student={labelOf(event.studentId)}
							onnote={(e) => (noteTarget = e)}
							onvoid={(e) => (voidTarget = e)}
						/>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
{/if}

<VoidDialog
	event={voidTarget}
	student={voidTarget ? labelOf(voidTarget.studentId) : ''}
	onconfirm={confirmVoid}
	onclose={() => (voidTarget = null)}
/>
<NoteDialog
	open={noteTarget !== null}
	title={noteTarget
		? t('note.title', { student: labelOf(noteTarget.studentId) })
		: t('common.loading')}
	initial={noteTarget?.note ?? ''}
	quick={noteTarget ? quickNotesFor(app.category(noteTarget.category), t) : []}
	onsave={saveNote}
	onclose={() => (noteTarget = null)}
/>
