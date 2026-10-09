import type { SchoolClass, Student, TallyEvent } from '../domain';
import { compareEvents } from '../domain';

/** Column headers and enum values stay in English whatever the UI language. */
export const CSV_COLUMNS = [
	'id',
	'class',
	'student',
	'category',
	'count',
	'action',
	'note',
	'createdAt',
	'updatedAt',
	'transcribedAt',
	'voidedAt',
	'localDate',
	'localTime'
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** Cells that a spreadsheet could read as a formula are prefixed with an apostrophe. */
function neutralise(text: string): string {
	return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function cell(value: string | number | undefined): string {
	if (value === undefined) return '';
	const text = typeof value === 'number' ? String(value) : neutralise(value);
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export interface CsvContext {
	classes: readonly SchoolClass[];
	students: readonly Student[];
}

/**
 * One row per event (voided ones included), oldest first. RFC 4180: comma-separated, CRLF line
 * ends, UTF-8 with a byte order mark so that Excel reads accents correctly. Timestamps are ISO 8601
 * UTC, plus the local date and time of `createdAt` in the device's time zone.
 */
export function eventsToCsv(events: readonly TallyEvent[], ctx: CsvContext): string {
	const classNames = new Map(ctx.classes.map((c) => [c.id, c.name]));
	const studentLabels = new Map(ctx.students.map((s) => [s.id, s.label]));
	const rows = [...events].sort(compareEvents).map((e) => {
		const d = new Date(e.createdAt);
		const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		const localTime = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		return [
			e.id,
			classNames.get(e.classId) ?? '',
			studentLabels.get(e.studentId) ?? '',
			e.category,
			e.countAtCreation,
			e.action,
			e.note,
			e.createdAt,
			e.updatedAt,
			e.transcribedAt,
			e.voidedAt,
			localDate,
			localTime
		]
			.map(cell)
			.join(',');
	});
	return '\uFEFF' + [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}
