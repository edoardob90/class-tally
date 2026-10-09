import type { Action, CategoryId, SchoolClass, Student, TallyEvent } from '../domain';

export type Clock = () => Date;

export interface RepositoryDeps {
	clock?: Clock;
	uuid?: () => string;
	/** Fixed device id (tests); otherwise one is generated on first use and stored. */
	deviceId?: string;
}

export interface Env {
	clock: Clock;
	uuid: () => string;
	deviceId?: string;
}

/** `crypto.randomUUID` only exists in secure contexts; plain-HTTP LAN testing needs a fallback. */
export function defaultUuid(): string {
	const c = globalThis.crypto;
	if (typeof c?.randomUUID === 'function') return c.randomUUID();
	const b = new Uint8Array(16);
	c.getRandomValues(b);
	b[6] = (b[6] & 0x0f) | 0x40;
	b[8] = (b[8] & 0x3f) | 0x80;
	const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function resolveDeps(deps: RepositoryDeps = {}): Env {
	return {
		clock: deps.clock ?? (() => new Date()),
		uuid: deps.uuid ?? defaultUuid,
		deviceId: deps.deviceId
	};
}

/**
 * Timestamp for a change: the current time, but always strictly after the previous `updatedAt`
 * of the same record so that last-write-wins comparisons stay meaningful within one millisecond.
 */
export function nextStamp(prev: string | undefined, env: Env): string {
	const now = env.clock().getTime();
	const before = prev ? Date.parse(prev) : Number.NEGATIVE_INFINITY;
	return new Date(Math.max(now, before + 1)).toISOString();
}

export class NotFoundError extends Error {
	constructor(
		readonly kind: 'class' | 'student' | 'event',
		readonly id: string
	) {
		super(`${kind} not found: ${id}`);
		this.name = 'NotFoundError';
	}
}

export interface NewStudent {
	name: string;
	surname: string;
	label: string;
	sortKey?: string;
}

export interface NewEvent {
	classId: string;
	studentId: string;
	category: CategoryId;
	/** ISO UTC; chosen by the caller so the snapshot and the timestamp come from the same instant. */
	createdAt: string;
	countAtCreation: number;
	action: Action;
	note?: string;
}

/** `null` removes an optional field. `createdAt` can never be patched. */
export interface EventPatch {
	note?: string | null;
	transcribedAt?: string | null;
	voidedAt?: string | null;
	checkRegister?: boolean | null;
	countAtCreation?: number;
	action?: Action;
}

export interface ClassPatch {
	name?: string;
	archived?: boolean;
}

export interface StudentPatch {
	name?: string;
	surname?: string;
	label?: string;
	sortKey?: string | null;
	active?: boolean;
}

export interface EventFilter {
	classId?: string;
	studentId?: string;
	category?: CategoryId;
	/** ISO UTC, inclusive. */
	from?: string;
	/** ISO UTC, exclusive. */
	to?: string;
	excludeVoided?: boolean;
}

export function makeClass(env: Env, name: string): SchoolClass {
	const now = nextStamp(undefined, env);
	return { id: env.uuid(), name: name.trim(), archived: false, createdAt: now, updatedAt: now };
}

export function patchClass(prev: SchoolClass, patch: ClassPatch, env: Env): SchoolClass {
	const next: SchoolClass = { ...prev };
	if (patch.name !== undefined) next.name = patch.name.trim();
	if (patch.archived !== undefined) next.archived = patch.archived;
	next.updatedAt = nextStamp(prev.updatedAt, env);
	return next;
}

export function makeStudent(env: Env, classId: string, input: NewStudent): Student {
	const now = nextStamp(undefined, env);
	const s: Student = {
		id: env.uuid(),
		classId,
		name: input.name.trim(),
		surname: input.surname.trim(),
		label: input.label.trim(),
		active: true,
		createdAt: now,
		updatedAt: now
	};
	if (input.sortKey) s.sortKey = input.sortKey;
	return s;
}

export function patchStudent(prev: Student, patch: StudentPatch, env: Env): Student {
	const next: Student = { ...prev };
	if (patch.name !== undefined) next.name = patch.name.trim();
	if (patch.surname !== undefined) next.surname = patch.surname.trim();
	if (patch.label !== undefined) next.label = patch.label.trim();
	if (patch.active !== undefined) next.active = patch.active;
	if (patch.sortKey === null || patch.sortKey === '') delete next.sortKey;
	else if (patch.sortKey !== undefined) next.sortKey = patch.sortKey;
	next.updatedAt = nextStamp(prev.updatedAt, env);
	return next;
}

export function makeEvent(env: Env, input: NewEvent, deviceId: string): TallyEvent {
	const e: TallyEvent = {
		id: env.uuid(),
		classId: input.classId,
		studentId: input.studentId,
		category: input.category,
		createdAt: input.createdAt,
		countAtCreation: input.countAtCreation,
		action: input.action,
		updatedAt: input.createdAt,
		deviceId
	};
	if (input.note) e.note = input.note;
	return e;
}

export function patchEvent(prev: TallyEvent, patch: EventPatch, env: Env): TallyEvent {
	const next: TallyEvent = { ...prev };
	if (patch.countAtCreation !== undefined) next.countAtCreation = patch.countAtCreation;
	if (patch.action !== undefined) next.action = patch.action;
	for (const key of ['note', 'transcribedAt', 'voidedAt', 'checkRegister'] as const) {
		const v = patch[key];
		if (v === undefined) continue;
		if (v === null || v === '') delete next[key];
		else (next as unknown as Record<string, unknown>)[key] = v;
	}
	next.updatedAt = nextStamp(prev.updatedAt, env);
	return next;
}

export function matchesEvent(e: TallyEvent, f: EventFilter): boolean {
	if (f.classId && e.classId !== f.classId) return false;
	if (f.studentId && e.studentId !== f.studentId) return false;
	if (f.category && e.category !== f.category) return false;
	if (f.excludeVoided && e.voidedAt) return false;
	if (f.from && Date.parse(e.createdAt) < Date.parse(f.from)) return false;
	if (f.to && Date.parse(e.createdAt) >= Date.parse(f.to)) return false;
	return true;
}
