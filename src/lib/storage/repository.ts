import type { AppSettings, SchoolClass, Student, TallyEvent } from '../domain';
import type { BackupData, ImportMode, ImportReport } from './backup';
import type {
	ClassPatch,
	EventFilter,
	EventPatch,
	NewEvent,
	NewStudent,
	StudentPatch
} from './common';

/**
 * The only storage API the rest of the app sees. Implementations set `id`, `deviceId` and
 * `updatedAt` (never callers); `createdAt` is set once and never changes. Returned objects are
 * copies: mutating them does not change the stored data.
 */
export interface Repository {
	/** Settings of this device; created with defaults and a new device id on first call. */
	getSettings(): Promise<AppSettings>;
	/** Replaces the settings. `deviceId` and `schemaVersion` are managed by the repository. */
	saveSettings(next: AppSettings): Promise<AppSettings>;

	listClasses(): Promise<SchoolClass[]>;
	createClass(input: { name: string }): Promise<SchoolClass>;
	updateClass(id: string, patch: ClassPatch): Promise<SchoolClass>;

	listStudents(classId?: string): Promise<Student[]>;
	addStudents(classId: string, inputs: readonly NewStudent[]): Promise<Student[]>;
	updateStudent(id: string, patch: StudentPatch): Promise<Student>;

	/** Events sorted by creation time (then id). Voided events are included unless excluded. */
	listEvents(filter?: EventFilter): Promise<TallyEvent[]>;
	getEvent(id: string): Promise<TallyEvent | undefined>;
	addEvent(input: NewEvent): Promise<TallyEvent>;
	/** All patches are applied in one transaction, or none is. */
	patchEvents(patches: readonly { id: string; patch: EventPatch }[]): Promise<TallyEvent[]>;
	/** Hard delete, used only by the undo that follows logging. Unknown ids are ignored. */
	deleteEvent(id: string): Promise<void>;

	exportAll(): Promise<BackupData>;
	/** Validates `raw` (an untrusted parsed backup) and applies it in one transaction. */
	importData(raw: unknown, mode: ImportMode): Promise<ImportReport>;
	/** Wipes classes, students and events; settings go back to defaults (device id and locale kept). */
	deleteAllData(): Promise<void>;

	/** Called after every successful mutation. Returns an unsubscribe function. */
	onChange(listener: () => void): () => void;
}
