import type { Action, CategoryId, CategorySettings } from '../domain';
import type { Key, TFn } from './translate';

/** Keys of the default quick notes, in the order of the English defaults. */
export const DEFAULT_QUICK_NOTE_KEYS: Record<CategoryId, readonly Key[]> = {
	behaviour: [
		'quickNotes.behaviour.talking',
		'quickNotes.behaviour.phone',
		'quickNotes.behaviour.outOfSeat',
		'quickNotes.behaviour.disrespect'
	],
	homework: [
		'quickNotes.homework.notDone',
		'quickNotes.homework.incomplete',
		'quickNotes.homework.forgotAtHome'
	],
	materials: [
		'quickNotes.materials.noTextbook',
		'quickNotes.materials.noCalculator',
		'quickNotes.materials.noNotebook',
		'quickNotes.materials.noPen'
	]
};

/** The user's label once edited, otherwise the default in the active locale. */
export function categoryLabel(cat: CategorySettings, t: TFn): string {
	return cat.labelEdited ? cat.label : t(`categories.${cat.id}`);
}

/** The user's quick notes once edited, otherwise the defaults in the active locale. */
export function quickNotesFor(cat: CategorySettings, t: TFn): string[] {
	return cat.quickNotesEdited
		? cat.quickNotes
		: DEFAULT_QUICK_NOTE_KEYS[cat.id].map((k) => t(k as never));
}

export function actionLabel(action: Action, t: TFn): string {
	return t(`actions.${action}`);
}

export function levelLetter(action: Action, t: TFn): string {
	return t(`levels.${action}`);
}
