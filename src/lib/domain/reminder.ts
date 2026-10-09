import type { AppSettings } from './types';
import { shiftDaysLocal, type DayShifter } from './time';

export interface BackupReminder {
	due: boolean;
	/** Whole days since the last export (or since the first event if there was never an export). */
	daysSince?: number;
	/** True when there has never been an export. */
	never: boolean;
}

/**
 * Whether to remind the teacher to export a backup. `backupReminderDays` of 0 turns it off.
 * Without any export the clock starts at the first event; with no data there is nothing to back up.
 */
export function backupReminder(
	settings: Pick<AppSettings, 'backupReminderDays' | 'lastExportAt'>,
	firstEventAt: string | undefined,
	nowMs: number,
	shift: DayShifter = shiftDaysLocal
): BackupReminder {
	const never = !settings.lastExportAt;
	const since = settings.lastExportAt ?? firstEventAt;
	if (settings.backupReminderDays <= 0 || !since) return { due: false, never };
	const sinceMs = Date.parse(since);
	const dueAt = shift(sinceMs, settings.backupReminderDays);
	const daysSince = Math.max(0, Math.floor((nowMs - sinceMs) / 86_400_000));
	return { due: nowMs >= dueAt, daysSince, never };
}
