/** Shifts a timestamp (epoch ms) by a number of days. */
export type DayShifter = (ms: number, days: number) => number;

/**
 * Shifts by calendar days in the device's local time zone, keeping the wall-clock time.
 * A local time that does not exist (spring forward) moves forward by the gap; an ambiguous
 * one (fall back) resolves to the earlier occurrence.
 */
export const shiftDaysLocal: DayShifter = (ms, days) => {
	const d = new Date(ms);
	d.setDate(d.getDate() + days);
	return d.getTime();
};

/** Exclusive lower bound of the window that ends at `nowMs`. */
export function windowStart(
	nowMs: number,
	windowDays: number,
	shift: DayShifter = shiftDaysLocal
): number {
	return shift(nowMs, -windowDays);
}

/** True when `createdAtMs` lies in the half-open interval (now - windowDays, now]. */
export function inWindow(
	createdAtMs: number,
	nowMs: number,
	windowDays: number,
	shift: DayShifter = shiftDaysLocal
): boolean {
	return createdAtMs > windowStart(nowMs, windowDays, shift) && createdAtMs <= nowMs;
}
