import { describe, expect, it } from 'vitest';
import type { SchoolClass, Student, TallyEvent } from '../../src/lib/domain';
import { CSV_COLUMNS, eventsToCsv } from '../../src/lib/storage';
import { local } from './helpers';

const cls: SchoolClass = {
	id: 'c1',
	name: '1AX',
	archived: false,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-01T00:00:00.000Z'
};
const student: Student = {
	id: 's1',
	classId: 'c1',
	name: 'Rita',
	surname: 'Lillà',
	label: 'Rita L.',
	active: true,
	createdAt: cls.createdAt,
	updatedAt: cls.createdAt
};

function event(over: Partial<TallyEvent>): TallyEvent {
	return {
		id: 'e1',
		classId: 'c1',
		studentId: 's1',
		category: 'behaviour',
		createdAt: new Date(local(2026, 10, 9, 8, 5)).toISOString(),
		countAtCreation: 2,
		action: 'register',
		updatedAt: '2026-10-09T07:00:00.000Z',
		deviceId: 'dev',
		...over
	};
}

const parse = (csv: string) => csv.slice(1).split('\r\n').filter(Boolean);

describe('eventsToCsv', () => {
	it('starts with a BOM, the English header and CRLF line ends', () => {
		const csv = eventsToCsv([], { classes: [cls], students: [student] });
		expect(csv.startsWith('\uFEFF')).toBe(true);
		expect(parse(csv)).toEqual([CSV_COLUMNS.join(',')]);
		expect(csv.endsWith('\r\n')).toBe(true);
	});

	it('writes one row per event with names, ISO UTC timestamps and local date and time', () => {
		const csv = eventsToCsv([event({ note: 'Phone', transcribedAt: '2026-10-09T09:00:00.000Z' })], {
			classes: [cls],
			students: [student]
		});
		const row = parse(csv)[1].split(',');
		expect(row).toEqual([
			'e1',
			'1AX',
			'Rita L.',
			'behaviour',
			'2',
			'register',
			'Phone',
			new Date(local(2026, 10, 9, 8, 5)).toISOString(),
			'2026-10-09T07:00:00.000Z',
			'2026-10-09T09:00:00.000Z',
			'',
			'2026-10-09',
			'08:05:00'
		]);
	});

	it('quotes commas, quotes and line breaks and keeps accents', () => {
		const csv = eventsToCsv([event({ note: 'Said "no", twice\nloudly è' })], {
			classes: [cls],
			students: [student]
		});
		expect(csv).toContain('"Said ""no"", twice\nloudly è"');
	});

	it('neutralises cells that a spreadsheet would read as formulas', () => {
		const csv = eventsToCsv(
			[event({ note: '=SUM(A1)' }), event({ id: 'e2', note: '-5 minutes' })],
			{
				classes: [cls],
				students: [student]
			}
		);
		expect(csv).toContain(",'=SUM(A1),");
		expect(csv).toContain(",'-5 minutes,");
	});

	it('includes voided events and orders oldest first', () => {
		const later = event({
			id: 'b',
			createdAt: new Date(local(2026, 10, 10, 8, 0)).toISOString(),
			voidedAt: '2026-10-10T09:00:00.000Z'
		});
		const earlier = event({ id: 'a' });
		const rows = parse(eventsToCsv([later, earlier], { classes: [cls], students: [student] }));
		expect(rows[1].startsWith('a,')).toBe(true);
		expect(rows[2].startsWith('b,')).toBe(true);
		expect(rows[2]).toContain('2026-10-10T09:00:00.000Z');
	});

	it('leaves names empty for unknown references', () => {
		const row = parse(eventsToCsv([event({})], { classes: [], students: [] }))[1].split(',');
		expect(row[1]).toBe('');
		expect(row[2]).toBe('');
	});
});
