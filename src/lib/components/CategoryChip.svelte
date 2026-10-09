<script lang="ts">
	import type { CategoryId } from '../domain';
	import { categoryLabel, t } from '../i18n';
	import { app } from '../state';
	import { categoryIcons } from './iconMaps';

	let { category }: { category: CategoryId } = $props();

	const Icon = $derived(categoryIcons[category]);
</script>

<span
	class="cat-{category} inline-flex items-center gap-1.5 rounded-lg border-2 border-[var(--cat)] bg-white py-0.5 pr-2 pl-0.5 text-sm font-bold text-ink"
>
	<span class="cat-tile size-6"><Icon size={16} /></span>
	{categoryLabel(app.category(category), t)}
</span>
