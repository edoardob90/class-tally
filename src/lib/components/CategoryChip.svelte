<script lang="ts">
	import type { CategoryId } from '../domain';
	import { categoryLabel, t } from '../i18n';
	import { app } from '../state';
	import { categoryIcons } from './iconMaps';

	let { category }: { category: CategoryId } = $props();

	const Icon = $derived(categoryIcons[category]);
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-2 py-0.5 text-sm font-semibold text-ink"
>
	<Icon size={16} />
	{categoryLabel(app.category(category), t)}
</span>
