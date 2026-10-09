<script lang="ts">
	import { previewNext, type Student } from '../domain';
	import { app } from '../state';
	import LevelChip from './LevelChip.svelte';

	let { students, onpick }: { students: Student[]; onpick: (student: Student) => void } = $props();
</script>

<ul class="grid grid-cols-2 gap-2">
	{#each students as student (student.id)}
		{@const events = app.studentEvents(student.id)}
		<li>
			<button
				type="button"
				class="flex min-h-[4.25rem] w-full flex-col justify-center gap-1 rounded-2xl border border-line bg-surface px-3 py-2 text-left active:bg-slate-100"
				aria-haspopup="dialog"
				onclick={() => onpick(student)}
			>
				<span class="block truncate text-base font-semibold">{student.label}</span>
				<span class="flex flex-wrap gap-1">
					{#each app.categories as cat (cat.id)}
						{@const next = previewNext(events, student.id, cat, app.now)}
						<LevelChip {cat} count={next.count - 1} next={next.action} />
					{/each}
				</span>
			</button>
		</li>
	{/each}
</ul>
