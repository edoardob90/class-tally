import { beforeEach, describe, expect, it } from 'vitest';
import {
	defaultCategory,
	planRecomputeAfterVoid,
	snapshotFor,
	type TallyEvent
} from '../../src/lib/domain';
import { ev, local, resetSeq } from './helpers';

const behaviour = defaultCategory('behaviour');

function week(): TallyEvent[] {
	// Mon, Tue, Thu, Fri and the following Wednesday, logged in order.
	const times = [
		local(2026, 10, 5, 10, 0),
		local(2026, 10, 6, 10, 0),
		local(2026, 10, 8, 10, 0),
		local(2026, 10, 9, 10, 0),
		local(2026, 10, 14, 10, 0)
	];
	const events: TallyEvent[] = [];
	for (const at of times) events.push(ev(at, snapshotFor(events, 's1', behaviour, at)));
	return events;
}

beforeEach(resetSeq);

describe('planRecomputeAfterVoid', () => {
	it('recomputes later untranscribed events inside the window', () => {
		const events = week(); // counts 1,2,3,4 then 3 (register)
		const plan = planRecomputeAfterVoid(events, events[1].id, behaviour);
		expect(plan).toEqual([
			{ id: events[2].id, patch: { countAtCreation: 2, action: 'register' } },
			{ id: events[3].id, patch: { countAtCreation: 3, action: 'register' } }
		]);
	});

	it('does not touch earlier events, or later events whose window did not contain the voided one', () => {
		const events = week();
		const ids = planRecomputeAfterVoid(events, events[1].id, behaviour).map((p) => p.id);
		expect(ids).not.toContain(events[0].id);
		expect(ids).not.toContain(events[4].id);
	});

	it('voiding the first event lowers the action of the following ones', () => {
		const events = week();
		const plan = planRecomputeAfterVoid(events, events[0].id, behaviour);
		expect(plan).toEqual([
			{ id: events[1].id, patch: { countAtCreation: 1, action: 'verbal' } },
			{ id: events[2].id, patch: { countAtCreation: 2, action: 'register' } },
			{ id: events[3].id, patch: { countAtCreation: 3, action: 'register' } }
		]);
	});

	it('keeps the snapshot of transcribed events and flags them when the action would change', () => {
		const events = week();
		events[3].transcribedAt = '2026-10-09T12:00:00.000Z'; // the note
		events[2].transcribedAt = '2026-10-08T12:00:00.000Z'; // a register entry, still register
		const plan = planRecomputeAfterVoid(events, events[1].id, behaviour);
		expect(plan).toEqual([{ id: events[3].id, patch: { checkRegister: true } }]);
	});

	it('does not flag again an event that is already flagged', () => {
		const events = week();
		events[3].transcribedAt = '2026-10-09T12:00:00.000Z';
		events[3].checkRegister = true;
		expect(planRecomputeAfterVoid(events, events[1].id, behaviour)).toEqual([
			{ id: events[2].id, patch: { countAtCreation: 2, action: 'register' } }
		]);
	});

	it('ignores other students, other categories and already voided events', () => {
		const events = week();
		const other = ev(local(2026, 10, 7, 10, 0), { student: 's2', countAtCreation: 1 });
		const hw = ev(local(2026, 10, 7, 11, 0), { category: 'homework' });
		const gone = ev(local(2026, 10, 7, 12, 0), { voidedAt: '2026-10-07T13:00:00.000Z' });
		const plan = planRecomputeAfterVoid([...events, other, hw, gone], events[1].id, behaviour);
		const ids = plan.map((p) => p.id);
		expect(ids).not.toContain(other.id);
		expect(ids).not.toContain(hw.id);
		expect(ids).not.toContain(gone.id);
	});

	it('returns nothing for an unknown event, and uses the current settings', () => {
		const events = week();
		expect(planRecomputeAfterVoid(events, 'missing', behaviour)).toEqual([]);
		const lenient = {
			...behaviour,
			ladder: [
				{ from: 1, action: 'verbal' as const },
				{ from: 5, action: 'register' as const }
			]
		};
		const plan = planRecomputeAfterVoid(events, events[1].id, lenient);
		expect(plan.find((p) => p.id === events[3].id)?.patch).toEqual({
			countAtCreation: 3,
			action: 'verbal'
		});
	});
});
