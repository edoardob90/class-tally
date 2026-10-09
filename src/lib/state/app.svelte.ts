import {
	backupReminder,
	needsTranscription,
	sortStudents,
	type AppSettings,
	type CategoryId,
	type CategorySettings,
	type Locale,
	type SchoolClass,
	type Student,
	type TallyEvent
} from '../domain';
import { locale, nameCollator } from '../i18n';
import { requestPersistence, type Repository } from '../storage';

/** Cache of the repository's data for the UI, plus the few app-wide derived values. */
class AppState {
	repo: Repository | undefined;
	ready = $state(false);
	failed = $state(false);
	settings = $state.raw<AppSettings | null>(null);
	classes = $state.raw<SchoolClass[]>([]);
	students = $state.raw<Student[]>([]);
	events = $state.raw<TallyEvent[]>([]);
	/** Wall clock, refreshed every minute so that expired events leave the counts. */
	now = $state(Date.now());

	private reloading = false;
	private reloadAgain = false;
	private started = false;

	activeClasses = $derived(this.classes.filter((c) => !c.archived));

	currentClass = $derived.by(() => {
		const id = this.settings?.lastClassId;
		return this.activeClasses.find((c) => c.id === id) ?? this.activeClasses[0];
	});

	/** Students of the current class that are shown in the grid, in register order. */
	currentStudents = $derived.by(() => {
		const classId = this.currentClass?.id;
		return sortStudents(
			this.students.filter((s) => s.active && s.classId === classId),
			nameCollator()
		);
	});

	/** Non-voided events grouped by student, for the live counts. */
	eventsByStudent = $derived.by(() => {
		const map = new Map<string, TallyEvent[]>();
		for (const e of this.events) {
			if (e.voidedAt) continue;
			const list = map.get(e.studentId);
			if (list) list.push(e);
			else map.set(e.studentId, [e]);
		}
		return map;
	});

	/** Events still to copy to the register, plus transcribed ones flagged "check register". */
	pendingCount = $derived(
		this.events.filter(needsTranscription).length +
			this.events.filter((e) => e.checkRegister && !e.voidedAt).length
	);

	/** Creation time of the oldest event: the backup reminder starts counting there without an export. */
	firstEventAt = $derived.by(() => {
		let first: string | undefined;
		for (const e of this.events) if (!first || e.createdAt < first) first = e.createdAt;
		return first;
	});

	backup = $derived(
		this.settings ? backupReminder(this.settings, this.firstEventAt, this.now) : undefined
	);

	/** The reminder is dismissed for the rest of the session only. */
	backupDismissed = $state(false);

	private persistenceRequested = false;

	get categories(): CategorySettings[] {
		return this.settings?.categories ?? [];
	}

	category(id: CategoryId): CategorySettings {
		const cat = this.categories.find((c) => c.id === id);
		if (!cat) throw new Error(`Unknown category ${id}`);
		return cat;
	}

	studentEvents(studentId: string): TallyEvent[] {
		return this.eventsByStudent.get(studentId) ?? [];
	}

	async init(repo: Repository): Promise<void> {
		if (this.started) return;
		this.started = true;
		this.repo = repo;
		try {
			const settings = await repo.getSettings();
			locale.set(settings.locale);
			this.settings = settings;
			await this.reload();
			repo.onChange(() => void this.reload());
			if (typeof document !== 'undefined') {
				document.addEventListener('visibilitychange', () => {
					if (document.visibilityState === 'visible') {
						this.now = Date.now();
						void this.reload();
					}
				});
				setInterval(() => (this.now = Date.now()), 60_000);
			}
			this.ready = true;
		} catch (error) {
			console.error('Storage failed to start', error);
			this.failed = true;
		}
	}

	/** Re-reads everything; overlapping calls are coalesced. */
	async reload(): Promise<void> {
		const repo = this.repo;
		if (!repo) return;
		if (this.reloading) {
			this.reloadAgain = true;
			return;
		}
		this.reloading = true;
		try {
			do {
				this.reloadAgain = false;
				const [settings, classes, students, events] = await Promise.all([
					repo.getSettings(),
					repo.listClasses(),
					repo.listStudents(),
					repo.listEvents()
				]);
				this.settings = settings;
				this.classes = classes;
				this.students = students;
				this.events = events;
				this.now = Date.now();
			} while (this.reloadAgain);
		} finally {
			this.reloading = false;
		}
	}

	/** Asks the browser once per session to keep the data (after the first successful write). */
	async protectStorage(): Promise<void> {
		if (this.persistenceRequested) return;
		this.persistenceRequested = true;
		await requestPersistence();
	}

	async selectClass(classId: string): Promise<void> {
		if (!this.repo || !this.settings || this.settings.lastClassId === classId) return;
		await this.repo.saveSettings({ ...this.settings, lastClassId: classId });
	}

	async setLocale(next: Locale): Promise<void> {
		locale.set(next);
		if (!this.repo || !this.settings || this.settings.locale === next) return;
		await this.repo.saveSettings({ ...this.settings, locale: next });
	}
}

export const app = new AppState();
