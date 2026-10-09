import { describe, expect, it } from 'vitest';
import { inWindow, shiftDaysLocal, windowStart } from '../../src/lib/domain';
import { local } from './helpers';

describe('time zone of the test run', () => {
	it('uses Europe/Rome', () => {
		expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Rome');
	});
});

describe('shiftDaysLocal', () => {
	it('keeps the wall-clock time across the spring DST change (2026-03-29)', () => {
		expect(shiftDaysLocal(local(2026, 3, 30, 10, 0), -7)).toBe(local(2026, 3, 23, 10, 0));
	});

	it('keeps the wall-clock time across the autumn DST change (2026-10-25)', () => {
		expect(shiftDaysLocal(local(2026, 10, 26, 10, 0), -7)).toBe(local(2026, 10, 19, 10, 0));
	});

	it('moves a non-existent local time forward', () => {
		const shifted = new Date(shiftDaysLocal(local(2026, 3, 30, 2, 30), -1));
		expect(shifted.getDate()).toBe(29);
		expect(shifted.getHours()).toBe(3);
		expect(shifted.getMinutes()).toBe(30);
	});
});

describe('inWindow (half-open interval)', () => {
	const now = local(2026, 10, 12, 10, 0);

	it('excludes an event exactly windowDays old', () => {
		expect(inWindow(local(2026, 10, 5, 10, 0), now, 7)).toBe(false);
	});

	it('includes an event one minute inside the window', () => {
		expect(inWindow(local(2026, 10, 5, 10, 1), now, 7)).toBe(true);
	});

	it('includes an event at exactly now and excludes the future', () => {
		expect(inWindow(now, now, 7)).toBe(true);
		expect(inWindow(now + 1, now, 7)).toBe(false);
	});

	it('uses calendar days over the autumn change: 10:30 a week earlier is still inside at 10:00', () => {
		const monday = local(2026, 10, 26, 10, 0);
		expect(inWindow(local(2026, 10, 19, 10, 30), monday, 7)).toBe(true);
		expect(inWindow(local(2026, 10, 19, 10, 0), monday, 7)).toBe(false);
		expect(inWindow(local(2026, 10, 19, 10, 1), monday, 7)).toBe(true);
	});

	it('uses calendar days over the spring change', () => {
		const monday = local(2026, 3, 30, 10, 0);
		expect(inWindow(local(2026, 3, 23, 10, 0), monday, 7)).toBe(false);
		expect(inWindow(local(2026, 3, 23, 10, 1), monday, 7)).toBe(true);
		expect(windowStart(monday, 7)).toBe(local(2026, 3, 23, 10, 0));
	});

	it('gives the same boundary behaviour in UTC', () => {
		const previous = process.env.TZ;
		process.env.TZ = 'UTC';
		try {
			const t = Date.UTC(2026, 9, 26, 10, 0);
			expect(inWindow(Date.UTC(2026, 9, 19, 10, 0), t, 7)).toBe(false);
			expect(inWindow(Date.UTC(2026, 9, 19, 10, 1), t, 7)).toBe(true);
		} finally {
			process.env.TZ = previous;
		}
	});
});
