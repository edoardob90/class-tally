<script lang="ts">
	import { t } from '../i18n';
	import { hints } from '../state';
	import { CircleQuestionMarkIcon } from './icons';
</script>

<button
	type="button"
	class="btn shrink-0 rounded-full px-2 {hints.on ? 'btn-primary' : 'text-muted'}"
	aria-pressed={hints.on}
	aria-label={t('hints.toggle')}
	title={t('hints.toggle')}
	onclick={() => hints.toggle()}
>
	<CircleQuestionMarkIcon size={22} />
</button>
