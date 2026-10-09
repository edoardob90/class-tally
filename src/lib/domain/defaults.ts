import type { AppSettings, CategoryId, CategorySettings } from './types';
import { CATEGORY_IDS } from './types';

/** Version of the stored data and of the backup format. */
export const SCHEMA_VERSION = 1;

/** English backing values; the UI shows the locale default until the user edits them. */
const DEFAULTS: Record<
	CategoryId,
	{ label: string; windowDays: number; noteFrom: number; quickNotes: string[] }
> = {
	behaviour: {
		label: 'Behaviour',
		windowDays: 7,
		noteFrom: 4,
		quickNotes: ['Talking', 'Phone', 'Out of seat', 'Disrespect']
	},
	homework: {
		label: 'Homework',
		windowDays: 30,
		noteFrom: 10,
		quickNotes: ['Not done', 'Incomplete', 'Forgot at home']
	},
	materials: {
		label: 'Materials',
		windowDays: 30,
		noteFrom: 10,
		quickNotes: ['No textbook', 'No calculator', 'No notebook', 'No pen']
	}
};

export function defaultCategory(id: CategoryId): CategorySettings {
	const d = DEFAULTS[id];
	return {
		id,
		label: d.label,
		windowDays: d.windowDays,
		ladder: [
			{ from: 1, action: 'verbal' },
			{ from: 2, action: 'register' },
			{ from: d.noteFrom, action: 'note' }
		],
		quickNotes: [...d.quickNotes]
	};
}

export function defaultCategories(): CategorySettings[] {
	return CATEGORY_IDS.map(defaultCategory);
}

export function defaultSettings(deviceId: string, now: string): AppSettings {
	return {
		categories: defaultCategories(),
		backupReminderDays: 7,
		updatedAt: now,
		locale: 'en',
		deviceId,
		schemaVersion: SCHEMA_VERSION
	};
}
