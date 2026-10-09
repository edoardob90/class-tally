import Dexie, { type Table } from 'dexie';
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
	type Env,
	type EventFilter,
	type EventPatch,
	type NewEvent,
	type NewStudent,
	type RepositoryDeps,
	type StudentPatch
} from './common';
import type { Repository } from './repository';

const SETTINGS_KEY = 'app';

type SettingsRow = AppSettings & { id: typeof SETTINGS_KEY };

class TallyDatabase extends Dexie {
	classes!: Table<SchoolClass, string>;
	students!: Table<Student, string>;
	events!: Table<TallyEvent, string>;
	settings!: Table<SettingsRow, string>;

	constructor(name: string) {
		super(name);
		// Schema version 1. Later versions add `this.version(n).stores(...).upgrade(...)` here and a
		// matching step in migrations.ts for backups.
		this.version(1).stores({
			classes: 'id',
			students: 'id, classId',
			events: 'id, classId, studentId, [studentId+category], createdAt',
			settings: 'id'
		});
	}
}

export interface DexieRepositoryDeps extends RepositoryDeps {
	/** IndexedDB database name (tests use a unique one per repository). */
	dbName?: string;
}

/** Dexie wraps errors thrown inside a transaction; hand the original back to callers. */
async function guard<T>(work: Promise<T>): Promise<T> {
	try {
		return await work;
	} catch (e) {
		const inner = (e as { inner?: unknown } | null)?.inner;
		if (inner instanceof NotFoundError) throw inner;
		throw e;
	}
}

const byCreated = <T extends { createdAt: string; id: string }>(a: T, b: T) =>
	Date.parse(a.createdAt) - Date.parse(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function toSettings(row: SettingsRow): AppSettings {
	const { id: _id, ...settings } = row;
	void _id;
	return settings;
}

async function ensureSettings(db: TallyDatabase, env: Env): Promise<AppSettings> {
	const row = await db.settings.get(SETTINGS_KEY);
	if (row) return toSettings(row);
	const created = defaultSettings(env.deviceId ?? env.uuid(), nextStamp(undefined, env));
	await db.settings.put({ ...created, id: SETTINGS_KEY });
	return created;
}

export function createDexieRepository(deps: DexieRepositoryDeps = {}): Repository {
	const env = resolveDeps(deps);
	const db = new TallyDatabase(deps.dbName ?? 'class-tally');
	const listeners = new Set<() => void>();
	const notify = () => listeners.forEach((l) => l());

	async function readContent(): Promise<BackupContent> {
		return db.transaction('rw', db.classes, db.students, db.events, db.settings, async () => {
			const settings = await ensureSettings(db, env);
			const [classes, students, events] = await Promise.all([
				db.classes.toArray(),
				db.students.toArray(),
				db.events.toArray()
			]);
			return {
				settings,
				classes: classes.sort(byCreated),
				students: students.sort(byCreated),
				events: events.sort(compareEvents)
			};
		});
	}

	const repo: Repository = {
		async getSettings() {
			return db.transaction('rw', db.settings, () => ensureSettings(db, env));
		},

		async saveSettings(next: AppSettings) {
			const saved = await db.transaction('rw', db.settings, async () => {
				const current = await ensureSettings(db, env);
				const settings: AppSettings = {
					...next,
					deviceId: current.deviceId,
					schemaVersion: SCHEMA_VERSION,
					updatedAt: nextStamp(current.updatedAt, env)
				};
				await db.settings.put({ ...settings, id: SETTINGS_KEY });
				return settings;
			});
			notify();
			return saved;
		},

		async listClasses() {
			return (await db.classes.toArray()).sort(byCreated);
		},

		async createClass(input: { name: string }) {
			const c = makeClass(env, input.name);
			await db.classes.add(c);
			notify();
			return c;
		},

		async updateClass(id: string, patch: ClassPatch) {
			const next = await db.transaction('rw', db.classes, async () => {
				const prev = await db.classes.get(id);
				if (!prev) throw new NotFoundError('class', id);
				const updated = patchClass(prev, patch, env);
				await db.classes.put(updated);
				return updated;
			});
			notify();
			return next;
		},

		async listStudents(classId?: string) {
			const rows = classId
				? await db.students.where('classId').equals(classId).toArray()
				: await db.students.toArray();
			return rows.sort(byCreated);
		},

		async addStudents(classId: string, inputs: readonly NewStudent[]) {
			const created = await db.transaction('rw', db.classes, db.students, async () => {
				if (!(await db.classes.get(classId))) throw new NotFoundError('class', classId);
				const items = inputs.map((i) => makeStudent(env, classId, i));
				await db.students.bulkAdd(items);
				return items;
			});
			notify();
			return created;
		},

		async updateStudent(id: string, patch: StudentPatch) {
			const next = await db.transaction('rw', db.students, async () => {
				const prev = await db.students.get(id);
				if (!prev) throw new NotFoundError('student', id);
				const updated = patchStudent(prev, patch, env);
				await db.students.put(updated);
				return updated;
			});
			notify();
			return next;
		},

		async listEvents(filter: EventFilter = {}) {
			let rows: TallyEvent[];
			if (filter.studentId) {
				rows = await db.events.where('studentId').equals(filter.studentId).toArray();
			} else if (filter.classId) {
				rows = await db.events.where('classId').equals(filter.classId).toArray();
			} else {
				rows = await db.events.toArray();
			}
			return rows.filter((e) => matchesEvent(e, filter)).sort(compareEvents);
		},

		async getEvent(id: string) {
			return db.events.get(id);
		},

		async addEvent(input: NewEvent) {
			const e = await db.transaction(
				'rw',
				db.classes,
				db.students,
				db.events,
				db.settings,
				async () => {
					if (!(await db.classes.get(input.classId)))
						throw new NotFoundError('class', input.classId);
					if (!(await db.students.get(input.studentId))) {
						throw new NotFoundError('student', input.studentId);
					}
					const settings = await ensureSettings(db, env);
					const created = makeEvent(env, input, settings.deviceId);
					await db.events.add(created);
					return created;
				}
			);
			notify();
			return e;
		},

		async patchEvents(patches: readonly { id: string; patch: EventPatch }[]) {
			const updated = await db.transaction('rw', db.events, async () => {
				const next = new Map<string, TallyEvent>();
				for (const { id, patch } of patches) {
					const prev = next.get(id) ?? (await db.events.get(id));
					if (!prev) throw new NotFoundError('event', id);
					next.set(id, patchEvent(prev, patch, env));
				}
				await db.events.bulkPut([...next.values()]);
				return [...next.values()];
			});
			if (updated.length) notify();
			return updated;
		},

		async deleteEvent(id: string) {
			await db.events.delete(id);
			notify();
		},

		async exportAll(): Promise<BackupData> {
			return buildBackup(await readContent(), env.clock().toISOString());
		},

		async importData(raw: unknown, mode: ImportMode): Promise<ImportReport> {
			const incoming = parseBackup(raw);
			const report = await db.transaction(
				'rw',
				db.classes,
				db.students,
				db.events,
				db.settings,
				async () => {
					const settings = await ensureSettings(db, env);
					const local: BackupContent = {
						settings,
						classes: await db.classes.toArray(),
						students: await db.students.toArray(),
						events: await db.events.toArray()
					};
					const { result, report: r } = planImport(local, incoming.data, mode);
					await Promise.all([
						db.classes.clear(),
						db.students.clear(),
						db.events.clear(),
						db.settings.clear()
					]);
					await db.classes.bulkAdd(result.classes);
					await db.students.bulkAdd(result.students);
					await db.events.bulkAdd(result.events);
					await db.settings.put({ ...result.settings, id: SETTINGS_KEY });
					return r;
				}
			);
			notify();
			return report;
		},

		async deleteAllData() {
			await db.transaction('rw', db.classes, db.students, db.events, db.settings, async () => {
				const current = await ensureSettings(db, env);
				await Promise.all([db.classes.clear(), db.students.clear(), db.events.clear()]);
				const fresh = {
					...defaultSettings(current.deviceId, nextStamp(current.updatedAt, env)),
					locale: current.locale
				};
				await db.settings.put({ ...fresh, id: SETTINGS_KEY });
			});
			notify();
		},

		onChange(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};

	return unwrapErrors(repo);
}

function unwrapErrors(repo: Repository): Repository {
	const wrapped = Object.fromEntries(
		Object.entries(repo).map(([key, fn]) => [
			key,
			key === 'onChange'
				? fn
				: (...args: unknown[]) => guard((fn as (...a: unknown[]) => Promise<unknown>)(...args))
		])
	);
	return wrapped as unknown as Repository;
}
