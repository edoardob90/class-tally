export const CATEGORY_IDS = ['behaviour', 'homework', 'materials'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const ACTIONS = ['verbal', 'register', 'note'] as const;
export type Action = (typeof ACTIONS)[number];

export const LOCALES = ['en', 'it'] as const;
export type Locale = (typeof LOCALES)[number];

export interface LadderStep {
	from: number;
	action: Action;
}

export interface CategorySettings {
	id: CategoryId;
	label: string;
	windowDays: number;
	ladder: LadderStep[];
	quickNotes: string[];
	/** True once the user typed a label: until then the UI shows the locale default. */
	labelEdited?: boolean;
	/** True once the user edited the quick notes: until then the UI shows the locale defaults. */
	quickNotesEdited?: boolean;
}

export interface SchoolClass {
	id: string;
	name: string;
	archived: boolean;
	/** ISO UTC, set once. */
	createdAt: string;
	/** ISO UTC, set on every change by the repository. */
	updatedAt: string;
}

export interface Student {
	id: string;
	classId: string;
	/** Given name (may be empty for hand-added students that only have a label). */
	name: string;
	/** Surname (may be empty). */
	surname: string;
	/** Display label, e.g. "Chiara D.". */
	label: string;
	sortKey?: string;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface TallyEvent {
	id: string;
	classId: string;
	studentId: string;
	category: CategoryId;
	/** ISO UTC, when the event was logged; never changes; used for the rolling window. */
	createdAt: string;
	countAtCreation: number;
	/** Snapshot of the ladder action at creation. */
	action: Action;
	note?: string;
	transcribedAt?: string;
	voidedAt?: string;
	checkRegister?: boolean;
	updatedAt: string;
	deviceId: string;
}

export interface AppSettings {
	categories: CategorySettings[];
	backupReminderDays: number;
	lastExportAt?: string;
	updatedAt: string;
	lastClassId?: string;
	locale: Locale;
	deviceId: string;
	schemaVersion: number;
}
