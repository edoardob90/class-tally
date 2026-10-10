import { addDaysToKey, dayKey, type CategoryId } from '../domain';

/**
 * View state that survives switching tabs, for the rest of the app session (never stored).
 * Pages read and write it instead of keeping their own `$state`, which is lost on navigation.
 */
class UiState {
	history = $state({
		mode: 'student' as 'student' | 'class',
		/** Empty until the page picks the current class. */
		classId: '',
		studentId: '',
		category: 'all' as 'all' | CategoryId,
		fromKey: addDaysToKey(dayKey(Date.now()), -6),
		toKey: dayKey(Date.now()),
		/** False while the range is the default one, which then follows the current day. */
		rangeSet: false
	});

	/** Categories whose section is expanded in Settings. */
	openCategories = $state<CategoryId[]>([]);

	setCategoryOpen(id: CategoryId, open: boolean): void {
		const has = this.openCategories.includes(id);
		if (open && !has) this.openCategories = [...this.openCategories, id];
		else if (!open && has) this.openCategories = this.openCategories.filter((c) => c !== id);
	}
}

export const ui = new UiState();
