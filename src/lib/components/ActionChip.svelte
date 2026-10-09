<script lang="ts">
	import type { Action } from '../domain';
	import { actionLabel, levelLetter, t } from '../i18n';
	import { actionIcons } from './iconMaps';

	let { action }: { action: Action } = $props();

	const Icon = $derived(actionIcons[action]);
</script>

<!-- What the entry is on the register: colour, icon, name and level letter. -->
<span
	class="level-{action} inline-flex items-center gap-1.5 rounded-lg border-2 px-2 py-0.5 text-sm font-bold"
>
	<Icon size={16} />
	{actionLabel(action, t)}
	<span class="rounded bg-white/70 px-1 text-xs">{levelLetter(action, t)}</span>
</span>
