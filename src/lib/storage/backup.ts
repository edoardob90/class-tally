import {
	ACTIONS,
	CATEGORY_IDS,
	LOCALES,
	SCHEMA_VERSION,
	planMerge,
	validateSettings,
	type AppSettings,
	type CategorySettings,
	type SchoolClass,
	type Student,
	type TallyEvent
} from '../domain';
import { CURRENT_SCHEMA_VERSION, migrateBackup } from './migrations';

export const BACKUP_FORMAT = 'class-tally-backup';

export interface BackupContent {
	settings: AppSettings;
	classes: SchoolClass[];
	students: Student[];
	events: TallyEvent[];
}

export interface BackupData {
	format: typeof BACKUP_FORMAT;
	schemaVersion: number;
	exportedAt: string;
	data: BackupContent;
}

export type BackupErrorCode =
	| 'backup.notJson'
	| 'backup.badFormat'
	| 'backup.newerSchema'
	| 'backup.invalid'
	| 'backup.integrity';

export class BackupError extends Error {
	constructor(
		readonly code: BackupErrorCode,
		readonly detail?: string
	) {
		super(detail ? `${code}: ${detail}` : code);
		this.name = 'BackupError';
	}
}

export interface Counts {
	added: number;
	updated: number;
	unchanged: number;
	/** Local records dropped by a replace. */
	removed: number;
}

export interface ImportReport {
	mode: ImportMode;
	classes: Counts;
	students: Counts;
	events: Counts;
	settings: 'replaced' | 'taken-from-backup' | 'kept-local';
}

export type ImportMode = 'replace' | 'merge';

export function buildBackup(content: BackupContent, exportedAt: string): BackupData {
	return {
		format: BACKUP_FORMAT,
		schemaVersion: SCHEMA_VERSION,
		exportedAt,
		data: content
	};
}

// ---------------------------------------------------------------------------------------------
// Parsing and validation of untrusted input. Only known fields are copied.
// ---------------------------------------------------------------------------------------------

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(path: string, what: string): never {
	throw new BackupError('backup.invalid', `${path}: ${what}`);
}

function str(r: Rec, key: string, path: string): string {
	const v = r[key];
	if (typeof v !== 'string') fail(`${path}.${key}`, 'expected a string');
	return v;
}

function iso(r: Rec, key: string, path: string): string {
	const v = str(r, key, path);
	if (Number.isNaN(Date.parse(v))) fail(`${path}.${key}`, 'expected an ISO date');
	return v;
}

function optStr(r: Rec, key: string, path: string): string | undefined {
	return r[key] === undefined ? undefined : str(r, key, path);
}

function optIso(r: Rec, key: string, path: string): string | undefined {
	return r[key] === undefined ? undefined : iso(r, key, path);
}

function bool(r: Rec, key: string, path: string): boolean {
	const v = r[key];
	if (typeof v !== 'boolean') fail(`${path}.${key}`, 'expected a boolean');
	return v;
}

function optBool(r: Rec, key: string, path: string): boolean | undefined {
	return r[key] === undefined ? undefined : bool(r, key, path);
}

function num(r: Rec, key: string, path: string): number {
	const v = r[key];
	if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${path}.${key}`, 'expected a number');
	return v;
}

function oneOf<T extends string>(r: Rec, key: string, allowed: readonly T[], path: string): T {
	const v = r[key];
	if (typeof v !== 'string' || !allowed.includes(v as T)) fail(`${path}.${key}`, 'unknown value');
	return v as T;
}

function array(v: unknown, path: string): unknown[] {
	if (!Array.isArray(v)) fail(path, 'expected a list');
	return v;
}

function set<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | undefined): void {
	if (value !== undefined) obj[key] = value as T[K];
}

function cleanCategory(v: unknown, path: string): CategorySettings {
	if (!isRec(v)) fail(path, 'expected an object');
	const ladder = array(v.ladder, `${path}.ladder`).map((s, i) => {
		const p = `${path}.ladder[${i}]`;
		if (!isRec(s)) fail(p, 'expected an object');
		return { from: num(s, 'from', p), action: oneOf(s, 'action', ACTIONS, p) };
	});
	const quickNotes = array(v.quickNotes, `${path}.quickNotes`).map((n, i) => {
		if (typeof n !== 'string') fail(`${path}.quickNotes[${i}]`, 'expected a string');
		return n;
	});
	const c: CategorySettings = {
		id: oneOf(v, 'id', CATEGORY_IDS, path),
		label: str(v, 'label', path),
		windowDays: num(v, 'windowDays', path),
		ladder,
		quickNotes
	};
	set(c, 'labelEdited', optBool(v, 'labelEdited', path));
	set(c, 'quickNotesEdited', optBool(v, 'quickNotesEdited', path));
	return c;
}

function cleanSettings(v: unknown): AppSettings {
	const path = 'data.settings';
	if (!isRec(v)) fail(path, 'expected an object');
	const s: AppSettings = {
		categories: array(v.categories, `${path}.categories`).map((c, i) =>
			cleanCategory(c, `${path}.categories[${i}]`)
		),
		backupReminderDays: num(v, 'backupReminderDays', path),
		updatedAt: iso(v, 'updatedAt', path),
		locale: oneOf(v, 'locale', LOCALES, path),
		deviceId: str(v, 'deviceId', path),
		schemaVersion: num(v, 'schemaVersion', path)
	};
	set(s, 'lastExportAt', optIso(v, 'lastExportAt', path));
	set(s, 'lastClassId', optStr(v, 'lastClassId', path));
	const issues = validateSettings(s);
	if (issues.length) fail(path, `${issues[0].code} at ${issues[0].path}`);
	return s;
}

function cleanClass(v: unknown, path: string): SchoolClass {
	if (!isRec(v)) fail(path, 'expected an object');
	return {
		id: str(v, 'id', path),
		name: str(v, 'name', path),
		archived: bool(v, 'archived', path),
		createdAt: iso(v, 'createdAt', path),
		updatedAt: iso(v, 'updatedAt', path)
	};
}

function cleanStudent(v: unknown, path: string): Student {
	if (!isRec(v)) fail(path, 'expected an object');
	const s: Student = {
		id: str(v, 'id', path),
		classId: str(v, 'classId', path),
		name: str(v, 'name', path),
		surname: str(v, 'surname', path),
		label: str(v, 'label', path),
		active: bool(v, 'active', path),
		createdAt: iso(v, 'createdAt', path),
		updatedAt: iso(v, 'updatedAt', path)
	};
	set(s, 'sortKey', optStr(v, 'sortKey', path));
	return s;
}

function cleanEvent(v: unknown, path: string): TallyEvent {
	if (!isRec(v)) fail(path, 'expected an object');
	const e: TallyEvent = {
		id: str(v, 'id', path),
		classId: str(v, 'classId', path),
		studentId: str(v, 'studentId', path),
		category: oneOf(v, 'category', CATEGORY_IDS, path),
		createdAt: iso(v, 'createdAt', path),
		countAtCreation: num(v, 'countAtCreation', path),
		action: oneOf(v, 'action', ACTIONS, path),
		updatedAt: iso(v, 'updatedAt', path),
		deviceId: str(v, 'deviceId', path)
	};
	set(e, 'note', optStr(v, 'note', path));
	set(e, 'transcribedAt', optIso(v, 'transcribedAt', path));
	set(e, 'voidedAt', optIso(v, 'voidedAt', path));
	set(e, 'checkRegister', optBool(v, 'checkRegister', path));
	return e;
}

function uniqueIds(items: { id: string }[], path: string): void {
	const seen = new Set<string>();
	for (const it of items) {
		if (seen.has(it.id)) fail(path, `duplicate id ${it.id}`);
		seen.add(it.id);
	}
}

/** Every student belongs to a class and every event to a class and student of the file. */
export function checkIntegrity(c: BackupContent): void {
	const classIds = new Set(c.classes.map((x) => x.id));
	const studentIds = new Set(c.students.map((x) => x.id));
	for (const s of c.students) {
		if (!classIds.has(s.classId)) throw new BackupError('backup.integrity', `student ${s.id}`);
	}
	for (const e of c.events) {
		if (!classIds.has(e.classId) || !studentIds.has(e.studentId)) {
			throw new BackupError('backup.integrity', `event ${e.id}`);
		}
	}
}

/** Validates and cleans a parsed backup; migrates older versions; throws `BackupError`. */
export function parseBackup(raw: unknown): BackupData {
	if (!isRec(raw) || raw.format !== BACKUP_FORMAT) throw new BackupError('backup.badFormat');
	const version = raw.schemaVersion;
	if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
		throw new BackupError('backup.badFormat');
	}
	if (version > CURRENT_SCHEMA_VERSION) {
		throw new BackupError('backup.newerSchema', String(version));
	}
	const migrated = migrateBackup(raw, version);
	if (!isRec(migrated.data)) fail('data', 'expected an object');
	const d = migrated.data;
	const content: BackupContent = {
		settings: cleanSettings(d.settings),
		classes: array(d.classes, 'data.classes').map((x, i) => cleanClass(x, `data.classes[${i}]`)),
		students: array(d.students, 'data.students').map((x, i) =>
			cleanStudent(x, `data.students[${i}]`)
		),
		events: array(d.events, 'data.events').map((x, i) => cleanEvent(x, `data.events[${i}]`))
	};
	uniqueIds(content.classes, 'data.classes');
	uniqueIds(content.students, 'data.students');
	uniqueIds(content.events, 'data.events');
	checkIntegrity(content);
	content.settings.schemaVersion = SCHEMA_VERSION;
	return {
		format: BACKUP_FORMAT,
		schemaVersion: SCHEMA_VERSION,
		exportedAt: iso(migrated, 'exportedAt', 'backup'),
		data: content
	};
}

/** Parses the text of a backup file. */
export function parseBackupText(text: string): BackupData {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		throw new BackupError('backup.notJson');
	}
	return parseBackup(json);
}

// ---------------------------------------------------------------------------------------------
// Import planning (pure): shared by both repositories and by the preview screen.
// ---------------------------------------------------------------------------------------------

export interface ImportPlan {
	/** The complete content after the import. */
	result: BackupContent;
	report: ImportReport;
}

function countAll<T extends { id: string; updatedAt: string }>(
	local: readonly T[],
	result: readonly T[]
): Counts {
	const mine = new Map(local.map((r) => [r.id, r]));
	const counts: Counts = { added: 0, updated: 0, unchanged: 0, removed: 0 };
	const kept = new Set<string>();
	for (const r of result) {
		kept.add(r.id);
		const prev = mine.get(r.id);
		if (!prev) counts.added++;
		else if (prev.updatedAt !== r.updatedAt) counts.updated++;
		else counts.unchanged++;
	}
	for (const id of mine.keys()) if (!kept.has(id)) counts.removed++;
	return counts;
}

function mergeTable<T extends { id: string; updatedAt: string }>(
	local: readonly T[],
	incoming: readonly T[]
): T[] {
	const plan = planMerge(local, incoming);
	const replaced = new Map(plan.replace.map((r) => [r.id, r]));
	return [...local.map((r) => replaced.get(r.id) ?? r), ...plan.insert];
}

/**
 * Computes the result of importing `incoming` into `local`.
 * - replace: everything comes from the backup;
 * - merge: records matched by id, the newer `updatedAt` wins (a tie keeps the local one).
 * The local `deviceId` is always kept.
 */
export function planImport(
	local: BackupContent,
	incoming: BackupContent,
	mode: ImportMode
): ImportPlan {
	let classes: SchoolClass[];
	let students: Student[];
	let events: TallyEvent[];
	let settings: AppSettings;
	let settingsOutcome: ImportReport['settings'];
	if (mode === 'replace') {
		classes = incoming.classes;
		students = incoming.students;
		events = incoming.events;
		settings = incoming.settings;
		settingsOutcome = 'replaced';
	} else {
		classes = mergeTable(local.classes, incoming.classes);
		students = mergeTable(local.students, incoming.students);
		events = mergeTable(local.events, incoming.events);
		const takeIncoming =
			Date.parse(incoming.settings.updatedAt) > Date.parse(local.settings.updatedAt);
		settings = takeIncoming ? incoming.settings : local.settings;
		settingsOutcome = takeIncoming ? 'taken-from-backup' : 'kept-local';
	}
	settings = { ...settings, deviceId: local.settings.deviceId, schemaVersion: SCHEMA_VERSION };
	const result: BackupContent = { settings, classes, students, events };
	checkIntegrity(result);
	return {
		result,
		report: {
			mode,
			classes: countAll(local.classes, classes),
			students: countAll(local.students, students),
			events: countAll(local.events, events),
			settings: settingsOutcome
		}
	};
}
