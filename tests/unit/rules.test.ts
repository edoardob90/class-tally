import { beforeEach, describe, expect, it } from 'vitest';
import {
	actionForCount,
	compareEvents,
	countInWindow,
	defaultCategory,
	liveCount,
	needsTranscription,
	previewNext,
	snapshotFor,
	type CategorySettings,
	type TallyEvent
} from '../../src/lib/domain';
import { ev, local, resetSeq } from './helpers';

const behaviour = defaultCategory('behaviour');
const homework = defaultCategory('homework');

/** Logs events one after another with the engine, as the app does. */
function logSequence(times: number[], cat: CategorySettings = behaviour): TallyEvent[] {
	const events: TallyEvent[] = [];
	for (const at of times) {
		const snap = snapshotFor(events, 's1', cat, at);
		events.push(ev(at, { category: cat.id, ...snap }));
	}
	return events;
}

beforeEach(resetSeq);

describe('actionForCount', () => {
	it('picks the step with the largest from not above the count', () => {
		const l = behaviour.ladder; // 1 verbal, 2 register, 4 note
		expect(actionForCount(l, 1)).toBe('verbal');
		expect(actionForCount(l, 2)).toBe('register');
		expect(actionForCount(l, 3)).toBe('register');
		expect(actionForCount(l, 4)).toBe('note');
	});

	it('keeps the highest step beyond the last one', () => {
		expect(actionForCount(behaviour.ladder, 5)).toBe('note');
		expect(actionForCount(behaviour.ladder, 40)).toBe('note');
		expect(actionForCount(homework.ladder, 9)).toBe('register');
		expect(actionForCount(homework.ladder, 10)).toBe('note');
		expect(actionForCount(homework.ladder, 11)).toBe('note');
	});

	it('supports ladders that stop at register', () => {
		const l = [
			{ from: 1, action: 'verbal' as const },
			{ from: 2, action: 'register' as const }
		];
		expect(actionForCount(l, 2)).toBe('register');
		expect(actionForCount(l, 9)).toBe('register');
	});

	it('does not depend on the order of the steps', () => {
		const l = [...behaviour.ladder].reverse();
		expect(actionForCount(l, 3)).toBe('register');
	});
});

describe('spec worked example (behaviour, 7-day window)', () => {
	it('Mon, Tue, Thu, Fri give verbal, register, register, note', () => {
		const events = logSequence([
			local(2026, 10, 5, 10, 0),
			local(2026, 10, 6, 10, 0),
			local(2026, 10, 8, 10, 0),
			local(2026, 10, 9, 10, 0)
		]);
		expect(events.map((e) => e.action)).toEqual(['verbal', 'register', 'register', 'note']);
		expect(events.map((e) => e.countAtCreation)).toEqual([1, 2, 3, 4]);
	});

	it('the following Wednesday counts Thu and Fri plus itself: count 3, register', () => {
		const events = logSequence([
			local(2026, 10, 5, 10, 0),
			local(2026, 10, 6, 10, 0),
			local(2026, 10, 8, 10, 0),
			local(2026, 10, 9, 10, 0)
		]);
		const wed = local(2026, 10, 14, 10, 0);
		expect(snapshotFor(events, 's1', behaviour, wed)).toEqual({
			countAtCreation: 3,
			action: 'register'
		});
		expect(liveCount(events, 's1', behaviour, wed)).toBe(2);
	});
});

describe('countInWindow', () => {
	const now = local(2026, 10, 20, 12, 0);

	it('excludes an event exactly windowDays old and includes one just inside', () => {
		const events = [
			ev(local(2026, 10, 13, 12, 0)), // exactly 7 days
			ev(local(2026, 10, 13, 12, 1)) // just inside
		];
		expect(
			countInWindow(events, { studentId: 's1', category: 'behaviour', windowDays: 7, at: now })
		).toBe(1);
	});

	it('uses a window per category', () => {
		const tenDaysAgo = local(2026, 10, 10, 12, 0);
		const events = [
			ev(tenDaysAgo, { category: 'behaviour' }),
			ev(tenDaysAgo, { category: 'homework' })
		];
		expect(liveCount(events, 's1', behaviour, now)).toBe(0);
		expect(liveCount(events, 's1', homework, now)).toBe(1);
	});

	it('ignores voided events, other students and other categories', () => {
		const at = local(2026, 10, 19, 12, 0);
		const events = [
			ev(at, { voidedAt: new Date(at + 1).toISOString() }),
			ev(at, { student: 's2' }),
			ev(at, { category: 'materials' }),
			ev(at)
		];
		expect(liveCount(events, 's1', behaviour, now)).toBe(1);
	});

	it('does not count events from the future', () => {
		expect(liveCount([ev(now + 60_000)], 's1', behaviour, now)).toBe(0);
	});
});

describe('previewNext and snapshots', () => {
	it('shows what the next event would be', () => {
		const now = local(2026, 10, 6, 12, 0);
		const events = logSequence([local(2026, 10, 5, 10, 0)]);
		expect(previewNext(events, 's1', behaviour, now)).toEqual({ count: 2, action: 'register' });
		expect(previewNext([], 's1', behaviour, now)).toEqual({ count: 1, action: 'verbal' });
	});

	it('changing settings does not alter existing events; new events use the new settings', () => {
		const events = logSequence([local(2026, 10, 5, 10, 0), local(2026, 10, 5, 11, 0)]);
		const before = structuredClone(events);
		const strict: CategorySettings = {
			...behaviour,
			ladder: [
				{ from: 1, action: 'register' },
				{ from: 2, action: 'note' }
			]
		};
		// The existing snapshots are plain stored values: nothing in the engine rewrites them.
		expect(events).toEqual(before);
		const next = snapshotFor(events, 's1', strict, local(2026, 10, 5, 12, 0));
		expect(next).toEqual({ countAtCreation: 3, action: 'note' });
		expect(events[1].action).toBe('register');
	});
});

describe('compareEvents', () => {
	it('orders by time and breaks ties by id', () => {
		const t = local(2026, 10, 5, 10, 0);
		const a = ev(t);
		const b = ev(t);
		const c = ev(t - 1000);
		expect([b, a, c].sort(compareEvents).map((e) => e.id)).toEqual([c.id, a.id, b.id]);
	});
});

describe('needsTranscription', () => {
	it('is true only for untranscribed, non-voided register and note events', () => {
		expect(needsTranscription(ev(1, { action: 'verbal' }))).toBe(false);
		expect(needsTranscription(ev(1, { action: 'register' }))).toBe(true);
		expect(needsTranscription(ev(1, { action: 'note' }))).toBe(true);
		expect(needsTranscription(ev(1, { action: 'note', transcribedAt: 'x' }))).toBe(false);
		expect(needsTranscription(ev(1, { action: 'note', voidedAt: 'x' }))).toBe(false);
	});
});
