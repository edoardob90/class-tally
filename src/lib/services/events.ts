import {
	LIMITS,
	needsTranscription,
	planRecomputeAfterVoid,
	snapshotFor,
	type CategoryId,
	type TallyEvent
} from '../domain';
import type { Repository } from '../storage';

export interface LogInput {
	classId: string;
	studentId: string;
	category: CategoryId;
}

/**
 * Logs an event. The snapshot (count and action) is computed from the stored events of the
 * student and category with the current settings, at the same instant as `createdAt`.
 */
export async function logEvent(
	repo: Repository,
	input: LogInput,
	now: Date = new Date()
): Promise<TallyEvent> {
	const settings = await repo.getSettings();
	const cat = settings.categories.find((c) => c.id === input.category);
	if (!cat) throw new Error(`Unknown category ${input.category}`);
	const existing = await repo.listEvents({
		studentId: input.studentId,
		category: input.category,
		excludeVoided: true
	});
	const snap = snapshotFor(existing, input.studentId, cat, now.getTime());
	return repo.addEvent({ ...input, createdAt: now.toISOString(), ...snap });
}

/** Undo right after logging: the event is removed entirely. */
export function undoLog(repo: Repository, eventId: string): Promise<void> {
	return repo.deleteEvent(eventId);
}

/** Sets or clears the note (trimmed, at most 200 characters). */
export async function setEventNote(
	repo: Repository,
	eventId: string,
	note: string
): Promise<TallyEvent> {
	const text = note.trim().slice(0, LIMITS.noteMax);
	const [updated] = await repo.patchEvents([{ id: eventId, patch: { note: text || null } }]);
	return updated;
}

export interface VoidResult {
	event: TallyEvent;
	/** Later events whose snapshot or flag changed. */
	recomputed: number;
}

/**
 * Voids an event and recomputes the snapshots of later untranscribed events of the same student
 * and category; transcribed ones keep theirs and are flagged "check register" if it would change.
 * Everything happens in one transaction.
 */
export async function voidEvent(
	repo: Repository,
	eventId: string,
	now: Date = new Date()
): Promise<VoidResult | undefined> {
	const target = await repo.getEvent(eventId);
	if (!target || target.voidedAt) return undefined;
	const settings = await repo.getSettings();
	const cat = settings.categories.find((c) => c.id === target.category);
	if (!cat) throw new Error(`Unknown category ${target.category}`);
	const related = await repo.listEvents({ studentId: target.studentId, category: target.category });
	const plan = planRecomputeAfterVoid(related, eventId, cat);
	const updated = await repo.patchEvents([
		{ id: eventId, patch: { voidedAt: now.toISOString(), checkRegister: null } },
		...plan
	]);
	return { event: updated[0], recomputed: plan.length };
}

/** Marks events as copied to the official register. Returns the ids actually changed. */
export async function markTranscribed(
	repo: Repository,
	eventIds: readonly string[],
	now: Date = new Date()
): Promise<string[]> {
	const changed: string[] = [];
	const patches = [];
	for (const id of eventIds) {
		const e = await repo.getEvent(id);
		if (!e || !needsTranscription(e)) continue;
		changed.push(id);
		patches.push({ id, patch: { transcribedAt: now.toISOString() } });
	}
	if (patches.length) await repo.patchEvents(patches);
	return changed;
}

/** Undo of `markTranscribed`. */
export async function unmarkTranscribed(
	repo: Repository,
	eventIds: readonly string[]
): Promise<void> {
	if (eventIds.length === 0) return;
	await repo.patchEvents(eventIds.map((id) => ({ id, patch: { transcribedAt: null } })));
}

/** The teacher has checked the register: clears the "check register" flag. */
export async function clearCheckFlag(repo: Repository, eventId: string): Promise<void> {
	await repo.patchEvents([{ id: eventId, patch: { checkRegister: null } }]);
}
