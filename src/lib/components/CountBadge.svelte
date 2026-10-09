<script lang="ts">
	import { t } from '../i18n';

	let { count }: { count: number } = $props();
</script>

<!-- "No. 3": how many in the window, including this one. Dark, so it stands out from the chips. -->
<span
	class="inline-flex items-center rounded-lg bg-ink px-2 py-0.5 text-sm font-bold text-white tabular-nums"
>
	{t('history.count', { count })}
</span>
