/** Validation limits and fixed timings. */
export const LIMITS = {
	windowDaysMin: 1,
	windowDaysMax: 365,
	ladderFromMax: 1000,
	labelMax: 30,
	quickNotesMax: 8,
	noteMax: 200,
	backupReminderDaysMax: 365,
	/** How long the toast (and with it the undo) stays available. */
	undoMs: 8000
} as const;
