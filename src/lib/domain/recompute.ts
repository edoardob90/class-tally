import { actionForCount, compareEvents } from './rules';
import { inWindow, shiftDaysLocal, type DayShifter } from './time';
import type { CategorySettings, TallyEvent } from './types';

export interface EventPatchPlan {
	id: string;
	patch: Partial<Pick<TallyEvent, 'countAtCreation' | 'action' | 'checkRegister'>>;
}

/**
 * Count an event had (or would have) when it was created, as if `ignoredId` did not exist:
 * non-voided events of the same student and category that precede it inside its window, plus itself.
 */
function countAtEvent(
	events: readonly TallyEvent[],
	target: TallyEvent,
	windowDays: number,
	ignoredId: string,
	shift: DayShifter
): number {
	const at = Date.parse(target.createdAt);
	let n = 1;
	for (const e of events) {
		if (e.id === target.id || e.id === ignoredId || e.voidedAt) continue;
		if (e.studentId !== target.studentId || e.category !== target.category) continue;
		if (compareEvents(e, target) >= 0) continue;
		if (inWindow(Date.parse(e.createdAt), at, windowDays, shift)) n++;
	}
	return n;
}

/**
 * Plans the changes to later events of the same student and category when `voidedId` is voided.
 * - untranscribed events get a new snapshot (count and action);
 * - transcribed events keep their snapshot and are flagged `checkRegister` if the action would change.
 * The current settings (`cat`) are used for the recomputation.
 */
export function planRecomputeAfterVoid(
	events: readonly TallyEvent[],
	voidedId: string,
	cat: CategorySettings,
	shift: DayShifter = shiftDaysLocal
): EventPatchPlan[] {
	const voided = events.find((e) => e.id === voidedId);
	if (!voided) return [];
	const plans: EventPatchPlan[] = [];
	for (const e of events) {
		if (e.id === voidedId || e.voidedAt) continue;
		if (e.studentId !== voided.studentId || e.category !== voided.category) continue;
		if (compareEvents(voided, e) >= 0) continue;
		// Only events whose window contained the voided one can change.
		if (!inWindow(Date.parse(voided.createdAt), Date.parse(e.createdAt), cat.windowDays, shift)) {
			continue;
		}
		const count = countAtEvent(events, e, cat.windowDays, voidedId, shift);
		const action = actionForCount(cat.ladder, count);
		if (!e.transcribedAt) {
			if (count !== e.countAtCreation || action !== e.action) {
				plans.push({ id: e.id, patch: { countAtCreation: count, action } });
			}
		} else if (action !== e.action && !e.checkRegister) {
			plans.push({ id: e.id, patch: { checkRegister: true } });
		}
	}
	return plans;
}
