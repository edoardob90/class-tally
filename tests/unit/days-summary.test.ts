import { describe, expect, it } from 'vitest';
import {
	addDaysToKey,
	dayKey,
	dayRangeBounds,
	fileStamp,
	isDayKey,
	startOfDay,
	type SchoolClass,
	type Student
} from '../../src/lib/domain';
import { buildTranscribeList, groupByDay } from '../../src/lib/services';
import { ev, local, resetSeq } from './helpers';

describe('local days', () => {
	it('names the local day of an instant', () => {
		expect(dayKey(local(2026, 10, 9, 0, 5))).toBe('2026-10-09');
		expect(dayKey(local(2026, 10, 9, 23, 59))).toBe('2026-10-09');
	});

	it('stamps file names with local date and time to the second', () => {
		expect(fileStamp(local(2026, 10, 9, 7, 4) + 3_000)).toBe('2026-10-09_07-04-03');
		expect(fileStamp(local(2026, 10, 9, 23, 59) + 59_000)).toBe('2026-10-09_23-59-59');
	});

	it('adds calendar days across the DST changes', () => {
		expect(addDaysToKey('2026-10-24', 1)).toBe('2026-10-25');
		expect(addDaysToKey('2026-10-25', 1)).toBe('2026-10-26');
		expect(addDaysToKey('2026-03-28', 2)).toBe('2026-03-30');
		expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
		expect(addDaysToKey('2026-02-27', 2)).toBe('2026-03-01');
	});

	it('has a 25-hour day when the clocks go back', () => {
		const { from, to } = dayRangeBounds('2026-10-25', '2026-10-25');
		expect((to - from) / 3_600_000).toBe(25);
		const spring = dayRangeBounds('2026-03-29', '2026-03-29');
		expect((spring.to - spring.from) / 3_600_000).toBe(23);
	});

	it('uses an inclusive range of days', () => {
		const { from, to } = dayRangeBounds('2026-10-05', '2026-10-07');
		expect(from).toBe(startOfDay('2026-10-05'));
		expect(to).toBe(startOfDay('2026-10-08'));
	});

	it('validates keys', () => {
		expect(isDayKey('2026-10-09')).toBe(true);
		expect(isDayKey('2026-02-30')).toBe(false);
		expect(isDayKey('9/10/2026')).toBe(false);
		expect(isDayKey('')).toBe(false);
	});
});

const cls = (id: string, name: string): SchoolClass => ({
	id,
	name,
	archived: false,
	createdAt: 'x',
	updatedAt: 'x'
});
const stu = (id: string, label: string, classId: string): Student => ({
	id,
	classId,
	name: label,
	surname: '',
	label,
	active: true,
	createdAt: 'x',
	updatedAt: 'x'
});

describe('buildTranscribeList', () => {
	const classes = [cls('c2', '2BX'), cls('c1', '1AX')];
	const students = [stu('s1', 'Davide A.', 'c1'), stu('s2', 'Rita L.', 'c2')];

	it('lists only register and note events that are not transcribed, grouped by class and day', () => {
		resetSeq();
		const events = [
			ev(local(2026, 10, 6, 9), { student: 's1', action: 'verbal' }),
			ev(local(2026, 10, 7, 9), { student: 's1', action: 'register' }),
			ev(local(2026, 10, 6, 10), { student: 's1', action: 'note' }),
			ev(local(2026, 10, 6, 11), { student: 's1', action: 'register', transcribedAt: 'x' }),
			ev(local(2026, 10, 6, 12), { student: 's1', action: 'register', voidedAt: 'x' }),
			ev(local(2026, 10, 6, 13), { student: 's2', classId: 'c2', action: 'register' })
		];
		const list = buildTranscribeList(events, classes, students);
		expect(list.pending).toBe(3);
		expect(list.classes.map((c) => c.name)).toEqual(['1AX', '2BX']);
		const first = list.classes[0];
		expect(first.days.map((d) => d.key)).toEqual(['2026-10-06', '2026-10-07']);
		expect(first.days[0].items.map((i) => [i.student, i.event.action])).toEqual([
			['Davide A.', 'note']
		]);
		expect(first.pendingIds).toHaveLength(2);
		expect(list.classes[1].days[0].items[0].student).toBe('Rita L.');
		expect(list.flagged).toEqual([]);
	});

	it('lists flagged transcribed events separately and skips voided ones', () => {
		resetSeq();
		const flagged = ev(local(2026, 10, 6, 9), {
			student: 's1',
			action: 'note',
			transcribedAt: 'x',
			checkRegister: true
		});
		const gone = ev(local(2026, 10, 6, 10), {
			student: 's1',
			action: 'note',
			transcribedAt: 'x',
			checkRegister: true,
			voidedAt: 'y'
		});
		const list = buildTranscribeList([flagged, gone], classes, students);
		expect(list.flagged.map((i) => i.event.id)).toEqual([flagged.id]);
		expect(list.pending).toBe(0);
		expect(list.classes).toEqual([]);
	});
});

describe('groupByDay', () => {
	it('keeps the input order of days and items', () => {
		resetSeq();
		const events = [
			ev(local(2026, 10, 7, 10)),
			ev(local(2026, 10, 7, 9)),
			ev(local(2026, 10, 6, 9))
		];
		const groups = groupByDay(events, (e) => e.createdAt);
		expect(groups.map((g) => [g.key, g.items.length])).toEqual([
			['2026-10-07', 2],
			['2026-10-06', 1]
		]);
	});
});
