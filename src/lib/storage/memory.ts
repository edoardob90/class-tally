import {
	defaultSettings,
	SCHEMA_VERSION,
	type AppSettings,
	type SchoolClass,
	type Student,
	type TallyEvent
} from '../domain';
import { compareEvents } from '../domain';
import {
	buildBackup,
	parseBackup,
	planImport,
	type BackupContent,
	type BackupData,
	type ImportMode,
	type ImportReport
} from './backup';
import {
	NotFoundError,
	makeClass,
	makeEvent,
	makeStudent,
	matchesEvent,
	nextStamp,
	patchClass,
	patchEvent,
	patchStudent,
	resolveDeps,
	type ClassPatch,
	type EventFilter,
	type EventPatch,
	type NewEvent,
	type NewStudent,
	type RepositoryDeps,
	type StudentPatch
} from './common';
import type { Repository } from './repository';

const copy = <T>(v: T): T => structuredClone(v);

/** In-memory repository for tests. Behaves like the Dexie one (same contract tests). */
export function createMemoryRepository(deps?: RepositoryDeps): Repository {
	const env = resolveDeps(deps);
	let settings: AppSettings | undefined;
	let classes = new Map<string, SchoolClass>();
	let students = new Map<string, Student>();
	let events = new Map<string, TallyEvent>();
	const listeners = new Set<() => void>();

	const notify = () => listeners.forEach((l) => l());

	function ensureSettings(): AppSettings {
		if (!settings) {
			settings = defaultSettings(env.deviceId ?? env.uuid(), nextStamp(undefined, env));
		}
		return settings;
	}

	const sorted = <T extends { createdAt: string; id: string }>(items: Iterable<T>): T[] =>
		[...items].sort(
			(a, b) =>
				Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
				(a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
		);

	function content(): BackupContent {
		return {
			settings: copy(ensureSettings()),
			classes: copy(sorted(classes.values())),
			students: copy(sorted(students.values())),
			events: copy([...events.values()].sort(compareEvents))
		};
	}

	return {
		async getSettings() {
			return copy(ensureSettings());
		},

		async saveSettings(next: AppSettings) {
			const current = ensureSettings();
			settings = {
				...copy(next),
				deviceId: current.deviceId,
				schemaVersion: SCHEMA_VERSION,
				updatedAt: nextStamp(current.updatedAt, env)
			};
			notify();
			return copy(settings);
		},

		async listClasses() {
			return copy(sorted(classes.values()));
		},

		async createClass(input: { name: string }) {
			const c = makeClass(env, input.name);
			classes.set(c.id, c);
			notify();
			return copy(c);
		},

		async updateClass(id: string, patch: ClassPatch) {
			const prev = classes.get(id);
			if (!prev) throw new NotFoundError('class', id);
			const next = patchClass(prev, patch, env);
			classes.set(id, next);
			notify();
			return copy(next);
		},

		async listStudents(classId?: string) {
			return copy(sorted([...students.values()].filter((s) => !classId || s.classId === classId)));
		},

		async addStudents(classId: string, inputs: readonly NewStudent[]) {
			if (!classes.has(classId)) throw new NotFoundError('class', classId);
			const created = inputs.map((i) => makeStudent(env, classId, i));
			for (const s of created) students.set(s.id, s);
			notify();
			return copy(created);
		},

		async updateStudent(id: string, patch: StudentPatch) {
			const prev = students.get(id);
			if (!prev) throw new NotFoundError('student', id);
			const next = patchStudent(prev, patch, env);
			students.set(id, next);
			notify();
			return copy(next);
		},

		async listEvents(filter: EventFilter = {}) {
			return copy([...events.values()].filter((e) => matchesEvent(e, filter)).sort(compareEvents));
		},

		async getEvent(id: string) {
			const e = events.get(id);
			return e ? copy(e) : undefined;
		},

		async addEvent(input: NewEvent) {
			if (!classes.has(input.classId)) throw new NotFoundError('class', input.classId);
			if (!students.has(input.studentId)) throw new NotFoundError('student', input.studentId);
			const e = makeEvent(env, input, ensureSettings().deviceId);
			events.set(e.id, e);
			notify();
			return copy(e);
		},

		async patchEvents(patches: readonly { id: string; patch: EventPatch }[]) {
			const next = new Map<string, TallyEvent>();
			for (const { id, patch } of patches) {
				const prev = next.get(id) ?? events.get(id);
				if (!prev) throw new NotFoundError('event', id);
				next.set(id, patchEvent(prev, patch, env));
			}
			for (const [id, e] of next) events.set(id, e);
			if (next.size) notify();
			return copy([...next.values()]);
		},

		async deleteEvent(id: string) {
			if (events.delete(id)) notify();
		},

		async exportAll(): Promise<BackupData> {
			return buildBackup(content(), env.clock().toISOString());
		},

		async importData(raw: unknown, mode: ImportMode): Promise<ImportReport> {
			const incoming = parseBackup(raw);
			const { result, report } = planImport(content(), incoming.data, mode);
			settings = result.settings;
			classes = new Map(result.classes.map((c) => [c.id, c]));
			students = new Map(result.students.map((s) => [s.id, s]));
			events = new Map(result.events.map((e) => [e.id, e]));
			notify();
			return report;
		},

		async deleteAllData() {
			const current = ensureSettings();
			classes = new Map();
			students = new Map();
			events = new Map();
			settings = {
				...defaultSettings(current.deviceId, nextStamp(current.updatedAt, env)),
				locale: current.locale
			};
			notify();
		},

		onChange(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};
}
