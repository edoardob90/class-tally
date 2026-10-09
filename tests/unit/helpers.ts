import type { Action, CategoryId, TallyEvent } from '../../src/lib/domain';

/** Epoch ms of a local (device time zone) date and time. Month is 1-based. */
export function local(y: number, m: number, d: number, h = 0, min = 0): number {
	return new Date(y, m - 1, d, h, min).getTime();
}

let seq = 0;

export function resetSeq(): void {
	seq = 0;
}

/** Test event builder; ids sort in creation order. */
export function ev(
	at: number,
	over: Partial<TallyEvent> & { student?: string; category?: CategoryId; action?: Action } = {}
): TallyEvent {
	const { student, ...rest } = over;
	const createdAt = new Date(at).toISOString();
	return {
		id: `e${String(++seq).padStart(4, '0')}`,
		classId: 'c1',
		studentId: student ?? 's1',
		category: 'behaviour',
		createdAt,
		countAtCreation: 1,
		action: 'verbal',
		updatedAt: createdAt,
		deviceId: 'dev',
		...rest
	};
}
