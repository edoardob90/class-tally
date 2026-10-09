import type { Action, CategoryId, CategorySettings, LadderStep, TallyEvent } from './types';
import { inWindow, shiftDaysLocal, type DayShifter } from './time';

/** Deterministic order: by creation time, then by id for identical timestamps. */
export function compareEvents(a: TallyEvent, b: TallyEvent): number {
	const ta = Date.parse(a.createdAt);
	const tb = Date.parse(b.createdAt);
	if (ta !== tb) return ta < tb ? -1 : 1;
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface CountQuery {
	studentId: string;
	category: CategoryId;
	windowDays: number;
	/** The instant the window ends at (epoch ms). */
	at: number;
}

/** Number of non-voided events of a student and category inside the rolling window. */
export function countInWindow(
	events: readonly TallyEvent[],
	q: CountQuery,
	shift: DayShifter = shiftDaysLocal
): number {
	let n = 0;
	for (const e of events) {
		if (e.voidedAt) continue;
		if (e.studentId !== q.studentId || e.category !== q.category) continue;
		if (inWindow(Date.parse(e.createdAt), q.at, q.windowDays, shift)) n++;
	}
	return n;
}

/**
 * Action of the ladder step with the largest `from` not above `count`.
 * Counts below the first step (not reachable with a valid ladder) fall back to the first action.
 */
export function actionForCount(ladder: readonly LadderStep[], count: number): Action {
	let result: Action | undefined;
	let best = -Infinity;
	for (const step of ladder) {
		if (step.from <= count && step.from > best) {
			best = step.from;
			result = step.action;
		}
	}
	return result ?? ladder[0]?.action ?? 'verbal';
}

export interface Preview {
	/** Count the next event would get (includes the event itself). */
	count: number;
	action: Action;
}

/** What an event logged now would be: count including itself, and its action. */
export function previewNext(
	events: readonly TallyEvent[],
	studentId: string,
	cat: CategorySettings,
	nowMs: number,
	shift: DayShifter = shiftDaysLocal
): Preview {
	const count =
		countInWindow(
			events,
			{ studentId, category: cat.id, windowDays: cat.windowDays, at: nowMs },
			shift
		) + 1;
	return { count, action: actionForCount(cat.ladder, count) };
}

/** Live count shown on the student grid (events inside the window now). */
export function liveCount(
	events: readonly TallyEvent[],
	studentId: string,
	cat: CategorySettings,
	nowMs: number,
	shift: DayShifter = shiftDaysLocal
): number {
	return countInWindow(
		events,
		{ studentId, category: cat.id, windowDays: cat.windowDays, at: nowMs },
		shift
	);
}

export interface Snapshot {
	countAtCreation: number;
	action: Action;
}

/** The snapshot to store on an event created at `nowMs`. */
export function snapshotFor(
	events: readonly TallyEvent[],
	studentId: string,
	cat: CategorySettings,
	nowMs: number,
	shift: DayShifter = shiftDaysLocal
): Snapshot {
	const p = previewNext(events, studentId, cat, nowMs, shift);
	return { countAtCreation: p.count, action: p.action };
}

/** True when the action has to be copied into the official register. */
export function needsTranscription(e: TallyEvent): boolean {
	return e.action !== 'verbal' && !e.transcribedAt && !e.voidedAt;
}
