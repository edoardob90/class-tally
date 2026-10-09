/** Local calendar days, as `YYYY-MM-DD` keys. Everything here uses the device's time zone. */

const pad = (n: number) => String(n).padStart(2, '0');

/** The local date of an instant, e.g. "2026-10-09". */
export function dayKey(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parts(key: string): [number, number, number] {
	const [y, m, d] = key.split('-').map(Number);
	return [y, m, d];
}

/** Local midnight at the start of the day. */
export function startOfDay(key: string): number {
	const [y, m, d] = parts(key);
	return new Date(y, m - 1, d).getTime();
}

/** The key of the day `days` calendar days after (or before, if negative) `key`. */
export function addDaysToKey(key: string, days: number): string {
	const [y, m, d] = parts(key);
	return dayKey(new Date(y, m - 1, d + days).getTime());
}

/** Whether the text is a valid `YYYY-MM-DD` key. */
export function isDayKey(key: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(key) && dayKey(startOfDay(key)) === key;
}

/** Bounds of an inclusive range of days: `from` inclusive, `to` exclusive (epoch ms). */
export function dayRangeBounds(fromKey: string, toKey: string): { from: number; to: number } {
	return { from: startOfDay(fromKey), to: startOfDay(addDaysToKey(toKey, 1)) };
}
