import {
	compareEvents,
	dayKey,
	needsTranscription,
	type SchoolClass,
	type Student,
	type TallyEvent
} from '../domain';

export interface SummaryItem {
	event: TallyEvent;
	student: string;
}

export interface SummaryDay {
	/** Local date, `YYYY-MM-DD`. */
	key: string;
	items: SummaryItem[];
}

export interface SummaryClass {
	classId: string;
	name: string;
	days: SummaryDay[];
	/** Ids of the events still to transcribe in this class. */
	pendingIds: string[];
}

export interface TranscribeList {
	/** Transcribed events whose action may have to change in the register. */
	flagged: SummaryItem[];
	classes: SummaryClass[];
	pending: number;
}

/**
 * "To transcribe": events with action register or note and no `transcribedAt`, grouped by class
 * (by name), then by local day (oldest first, so nothing at the bottom gets forgotten), plus the
 * transcribed events flagged "check register".
 */
export function buildTranscribeList(
	events: readonly TallyEvent[],
	classes: readonly SchoolClass[],
	students: readonly Student[],
	collator: Intl.Collator = new Intl.Collator(undefined, { numeric: true })
): TranscribeList {
	const labels = new Map(students.map((s) => [s.id, s.label]));
	const names = new Map(classes.map((c) => [c.id, c.name]));
	const item = (event: TallyEvent): SummaryItem => ({
		event,
		student: labels.get(event.studentId) ?? ''
	});
	const sorted = [...events].sort(compareEvents);
	const flagged = sorted.filter((e) => e.checkRegister && !e.voidedAt).map(item);
	const pending = sorted.filter(needsTranscription);

	const byClass = new Map<string, SummaryClass>();
	for (const event of pending) {
		let cls = byClass.get(event.classId);
		if (!cls) {
			cls = {
				classId: event.classId,
				name: names.get(event.classId) ?? '',
				days: [],
				pendingIds: []
			};
			byClass.set(event.classId, cls);
		}
		cls.pendingIds.push(event.id);
		const key = dayKey(Date.parse(event.createdAt));
		let day = cls.days.find((d) => d.key === key);
		if (!day) {
			day = { key, items: [] };
			cls.days.push(day);
		}
		day.items.push(item(event));
	}
	return {
		flagged,
		classes: [...byClass.values()].sort((a, b) => collator.compare(a.name, b.name)),
		pending: pending.length
	};
}

export interface DayGroup<T> {
	key: string;
	items: T[];
}

/** Groups events by local day. Order of days and of items follows the input order. */
export function groupByDay<T>(items: readonly T[], at: (item: T) => string): DayGroup<T>[] {
	const groups: DayGroup<T>[] = [];
	for (const item of items) {
		const key = dayKey(Date.parse(at(item)));
		const last = groups.at(-1);
		if (last && last.key === key) last.items.push(item);
		else {
			const existing = groups.find((g) => g.key === key);
			if (existing) existing.items.push(item);
			else groups.push({ key, items: [item] });
		}
	}
	return groups;
}
