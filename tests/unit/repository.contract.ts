import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../../src/lib/domain';
import {
	BackupError,
	NotFoundError,
	type Repository,
	type RepositoryDeps
} from '../../src/lib/storage';

export type RepositoryFactory = (deps: RepositoryDeps) => Repository;

/** A clock the test moves by hand. */
export function fakeClock(startIso = '2026-10-05T08:00:00.000Z') {
	let t = Date.parse(startIso);
	return {
		clock: () => new Date(t),
		advance(ms = 60_000) {
			t += ms;
		},
		get now() {
			return new Date(t).toISOString();
		}
	};
}

let counter = 0;
function uuidFactory(prefix: string) {
	return () => `${prefix}-${String(++counter).padStart(5, '0')}`;
}

function setup(factory: RepositoryFactory, deviceId = 'dev-A') {
	const time = fakeClock();
	const repo = factory({ clock: time.clock, uuid: uuidFactory(deviceId), deviceId });
	return { repo, time };
}

async function seed(repo: Repository, time: ReturnType<typeof fakeClock>) {
	const cls = await repo.createClass({ name: '1AX' });
	const other = await repo.createClass({ name: '2BX' });
	const [s1, s2] = await repo.addStudents(cls.id, [
		{ name: 'Davide', surname: 'Acacia', label: 'Davide A.' },
		{ name: 'Rita', surname: 'Lillà', label: 'Rita L.', sortKey: '0' }
	]);
	const [s3] = await repo.addStudents(other.id, [
		{ name: 'Zeno', surname: 'Camelia', label: 'Zeno C.' }
	]);
	const log = async (studentId: string, classId: string, category: 'behaviour' | 'homework') => {
		time.advance();
		return repo.addEvent({
			classId,
			studentId,
			category,
			createdAt: time.now,
			countAtCreation: 1,
			action: 'verbal'
		});
	};
	const e1 = await log(s1.id, cls.id, 'behaviour');
	const e2 = await log(s1.id, cls.id, 'behaviour');
	const e3 = await log(s2.id, cls.id, 'homework');
	const e4 = await log(s3.id, other.id, 'behaviour');
	time.advance();
	await repo.patchEvents([
		{ id: e2.id, patch: { note: 'Phone, again', transcribedAt: time.now, checkRegister: true } },
		{ id: e3.id, patch: { voidedAt: time.now } }
	]);
	const settings = await repo.getSettings();
	time.advance();
	await repo.saveSettings({
		...settings,
		locale: 'it',
		lastClassId: cls.id,
		lastExportAt: time.now,
		categories: settings.categories.map((c) =>
			c.id === 'behaviour' ? { ...c, label: 'Condotta', labelEdited: true, windowDays: 14 } : c
		)
	});
	return { cls, other, s1, s2, s3, e1, e2, e3, e4 };
}

export function runRepositoryContract(name: string, factory: RepositoryFactory): void {
	describe(`Repository contract: ${name}`, () => {
		describe('settings', () => {
			it('creates defaults with the device id on first read, and is idempotent', async () => {
				const { repo } = setup(factory);
				const a = await repo.getSettings();
				const b = await repo.getSettings();
				expect(a.deviceId).toBe('dev-A');
				expect(a.locale).toBe('en');
				expect(a.categories).toHaveLength(3);
				expect(b).toEqual(a);
			});

			it('generates a device id when none is given', async () => {
				const time = fakeClock();
				const repo = factory({ clock: time.clock, uuid: uuidFactory('gen') });
				expect((await repo.getSettings()).deviceId).toMatch(/^gen-/);
			});

			it('bumps updatedAt, keeps deviceId and sets schemaVersion', async () => {
				const { repo, time } = setup(factory);
				const before = await repo.getSettings();
				time.advance();
				const saved = await repo.saveSettings({
					...before,
					locale: 'it',
					deviceId: 'hacker',
					schemaVersion: 99
				});
				expect(saved.locale).toBe('it');
				expect(saved.deviceId).toBe('dev-A');
				expect(saved.schemaVersion).toBe(1);
				expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse(before.updatedAt));
				expect(await repo.getSettings()).toEqual(saved);
			});
		});

		describe('classes and students', () => {
			it('sets createdAt once and bumps updatedAt on every change', async () => {
				const { repo, time } = setup(factory);
				const c = await repo.createClass({ name: ' 1AX ' });
				expect(c.name).toBe('1AX');
				expect(c.createdAt).toBe(c.updatedAt);
				time.advance();
				const renamed = await repo.updateClass(c.id, { name: '1AY' });
				time.advance();
				const archived = await repo.updateClass(c.id, { archived: true });
				expect(renamed.createdAt).toBe(c.createdAt);
				expect(archived.createdAt).toBe(c.createdAt);
				expect(Date.parse(renamed.updatedAt)).toBeGreaterThan(Date.parse(c.updatedAt));
				expect(Date.parse(archived.updatedAt)).toBeGreaterThan(Date.parse(renamed.updatedAt));
				expect(archived).toMatchObject({ name: '1AY', archived: true });
				expect(await repo.listClasses()).toEqual([archived]);
			});

			it('bumps updatedAt even when the clock does not move', async () => {
				const { repo } = setup(factory);
				const c = await repo.createClass({ name: 'A' });
				const a = await repo.updateClass(c.id, { name: 'B' });
				const b = await repo.updateClass(c.id, { name: 'C' });
				expect(Date.parse(a.updatedAt)).toBeGreaterThan(Date.parse(c.updatedAt));
				expect(Date.parse(b.updatedAt)).toBeGreaterThan(Date.parse(a.updatedAt));
			});

			it('adds, updates and filters students', async () => {
				const { repo, time } = setup(factory);
				const c1 = await repo.createClass({ name: 'A' });
				const c2 = await repo.createClass({ name: 'B' });
				const [s] = await repo.addStudents(c1.id, [
					{ name: 'Davide', surname: 'Acacia', label: 'Davide A.', sortKey: 'zz' }
				]);
				await repo.addStudents(c2.id, [{ name: 'Rita', surname: 'Lillà', label: 'Rita L.' }]);
				expect(s.active).toBe(true);
				expect(await repo.listStudents()).toHaveLength(2);
				expect(await repo.listStudents(c1.id)).toEqual([s]);
				time.advance();
				const u = await repo.updateStudent(s.id, { active: false, sortKey: null, label: 'D. A.' });
				expect(u).toMatchObject({ active: false, label: 'D. A.' });
				expect('sortKey' in u).toBe(false);
				expect(u.createdAt).toBe(s.createdAt);
				expect(Date.parse(u.updatedAt)).toBeGreaterThan(Date.parse(s.updatedAt));
			});

			it('rejects unknown parents and ids', async () => {
				const { repo } = setup(factory);
				await expect(repo.addStudents('nope', [])).rejects.toBeInstanceOf(NotFoundError);
				await expect(repo.updateClass('nope', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
				await expect(repo.updateStudent('nope', { active: false })).rejects.toBeInstanceOf(
					NotFoundError
				);
			});
		});

		describe('events', () => {
			it('stores the snapshot and sets id, deviceId and updatedAt', async () => {
				const { repo, time } = setup(factory);
				const { cls, s1 } = await seed(repo, time);
				time.advance();
				const e = await repo.addEvent({
					classId: cls.id,
					studentId: s1.id,
					category: 'homework',
					createdAt: time.now,
					countAtCreation: 3,
					action: 'register',
					note: 'No book'
				});
				expect(e).toMatchObject({
					deviceId: 'dev-A',
					countAtCreation: 3,
					action: 'register',
					note: 'No book',
					updatedAt: e.createdAt
				});
				expect(e.id).toBeTruthy();
				expect('voidedAt' in e).toBe(false);
			});

			it('rejects events for an unknown class or student', async () => {
				const { repo, time } = setup(factory);
				const { cls, s1 } = await seed(repo, time);
				const base = {
					category: 'behaviour' as const,
					createdAt: time.now,
					countAtCreation: 1,
					action: 'verbal' as const
				};
				await expect(
					repo.addEvent({ ...base, classId: 'nope', studentId: s1.id })
				).rejects.toBeInstanceOf(NotFoundError);
				await expect(
					repo.addEvent({ ...base, classId: cls.id, studentId: 'nope' })
				).rejects.toBeInstanceOf(NotFoundError);
			});

			it('lists sorted and filtered', async () => {
				const { repo, time } = setup(factory);
				const { cls, s1, s2, e1, e2, e3 } = await seed(repo, time);
				const all = await repo.listEvents();
				expect(all.map((e) => e.id)).toEqual(
					[...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((e) => e.id)
				);
				expect(all).toHaveLength(4);
				expect((await repo.listEvents({ classId: cls.id })).map((e) => e.id)).toEqual([
					e1.id,
					e2.id,
					e3.id
				]);
				expect((await repo.listEvents({ studentId: s2.id })).map((e) => e.id)).toEqual([e3.id]);
				expect((await repo.listEvents({ studentId: s1.id, category: 'behaviour' })).length).toBe(2);
				expect((await repo.listEvents({ excludeVoided: true })).map((e) => e.id)).not.toContain(
					e3.id
				);
				expect(
					(await repo.listEvents({ from: e2.createdAt, to: e3.createdAt })).map((e) => e.id)
				).toEqual([e2.id]);
			});

			it('patches fields, clears with null, never changes createdAt, bumps updatedAt', async () => {
				const { repo, time } = setup(factory);
				const { e2 } = await seed(repo, time);
				time.advance();
				const [p] = await repo.patchEvents([
					{
						id: e2.id,
						patch: {
							transcribedAt: null,
							checkRegister: null,
							note: 'Edited',
							// A caller cannot smuggle a createdAt change in.
							...({ createdAt: '2000-01-01T00:00:00.000Z' } as object)
						}
					}
				]);
				expect(p.createdAt).toBe(e2.createdAt);
				expect(p.note).toBe('Edited');
				expect('transcribedAt' in p).toBe(false);
				expect('checkRegister' in p).toBe(false);
				expect(Date.parse(p.updatedAt)).toBeGreaterThan(Date.parse(e2.updatedAt));
				const stored = (await repo.listEvents()).find((e) => e.id === e2.id);
				expect(stored).toEqual(p);
			});

			it('applies a batch of patches atomically', async () => {
				const { repo, time } = setup(factory);
				const { e1, e2 } = await seed(repo, time);
				const before = await repo.listEvents();
				time.advance();
				await expect(
					repo.patchEvents([
						{ id: e1.id, patch: { note: 'changed' } },
						{ id: e2.id, patch: { note: 'changed' } },
						{ id: 'missing', patch: { note: 'changed' } }
					])
				).rejects.toBeInstanceOf(NotFoundError);
				expect(await repo.listEvents()).toEqual(before);
			});

			it('keeps the snapshot of existing events when settings change', async () => {
				const { repo, time } = setup(factory);
				const { e1 } = await seed(repo, time);
				const s = await repo.getSettings();
				time.advance();
				await repo.saveSettings({
					...s,
					categories: s.categories.map((c) => ({
						...c,
						ladder: [{ from: 1, action: 'note' as const }]
					}))
				});
				const stored = (await repo.listEvents()).find((e) => e.id === e1.id);
				expect(stored).toMatchObject({ action: e1.action, countAtCreation: e1.countAtCreation });
			});

			it('gets one event by id, or undefined', async () => {
				const { repo, time } = setup(factory);
				const { e1 } = await seed(repo, time);
				expect(await repo.getEvent(e1.id)).toEqual(e1);
				expect(await repo.getEvent('missing')).toBeUndefined();
			});

			it('deletes an event for undo, ignoring unknown ids', async () => {
				const { repo, time } = setup(factory);
				const { e1 } = await seed(repo, time);
				await repo.deleteEvent(e1.id);
				await repo.deleteEvent(e1.id);
				expect((await repo.listEvents()).map((e) => e.id)).not.toContain(e1.id);
			});

			it('returns copies, not live objects', async () => {
				const { repo, time } = setup(factory);
				await seed(repo, time);
				const list = await repo.listEvents();
				list[0].note = 'tampered';
				const settings = await repo.getSettings();
				settings.categories[0].label = 'tampered';
				expect((await repo.listEvents())[0].note).not.toBe('tampered');
				expect((await repo.getSettings()).categories[0].label).not.toBe('tampered');
			});
		});

		describe('change notifications', () => {
			it('notifies after mutations until unsubscribed', async () => {
				const { repo } = setup(factory);
				let n = 0;
				const off = repo.onChange(() => n++);
				await repo.createClass({ name: 'A' });
				expect(n).toBe(1);
				off();
				await repo.createClass({ name: 'B' });
				expect(n).toBe(1);
			});
		});

		describe('backup', () => {
			it('round-trips export and import exactly, including createdAt and updatedAt', async () => {
				const a = setup(factory, 'dev-A');
				await seed(a.repo, a.time);
				const exported = await a.repo.exportAll();
				// Through real JSON, as a file would be.
				const text = JSON.stringify(exported);
				const b = setup(factory, 'dev-A');
				const report = await b.repo.importData(JSON.parse(text), 'replace');
				expect(report.events.added).toBe(4);
				const again = await b.repo.exportAll();
				expect(again.data).toEqual(exported.data);
				expect(again.format).toBe('class-tally-backup');
			});

			it('keeps the local device id on import', async () => {
				const a = setup(factory, 'dev-A');
				await seed(a.repo, a.time);
				const b = setup(factory, 'dev-B');
				await b.repo.importData(await a.repo.exportAll(), 'replace');
				expect((await b.repo.getSettings()).deviceId).toBe('dev-B');
				expect((await b.repo.exportAll()).data.events.every((e) => e.deviceId === 'dev-A')).toBe(
					true
				);
			});

			it('replace drops local records that are not in the backup', async () => {
				const a = setup(factory, 'dev-A');
				const b = setup(factory, 'dev-B');
				await seed(a.repo, a.time);
				await seed(b.repo, b.time);
				const report = await b.repo.importData(await a.repo.exportAll(), 'replace');
				expect(report.events.removed).toBe(4);
				expect(report.events.added).toBe(4);
				expect(report.settings).toBe('replaced');
				expect((await b.repo.listEvents()).map((e) => e.id).sort()).toEqual(
					(await a.repo.listEvents()).map((e) => e.id).sort()
				);
			});

			it('merge keeps the newer record per id, inserts new ones and never loses local data', async () => {
				const a = setup(factory, 'dev-A');
				const { e1, e2, cls, s1 } = await seed(a.repo, a.time);
				const b = setup(factory, 'dev-B');
				b.time.advance(10 * 60_000);
				await b.repo.importData(await a.repo.exportAll(), 'replace');
				// Diverge: A edits e1 later, B edits e2 later, A adds a new event.
				a.time.advance(3_600_000);
				await a.repo.patchEvents([{ id: e1.id, patch: { note: 'from A' } }]);
				const newEvent = await a.repo.addEvent({
					classId: cls.id,
					studentId: s1.id,
					category: 'behaviour',
					createdAt: a.time.now,
					countAtCreation: 1,
					action: 'verbal'
				});
				b.time.advance(2 * 3_600_000);
				await b.repo.patchEvents([{ id: e2.id, patch: { note: 'from B' } }]);
				const report = await b.repo.importData(await a.repo.exportAll(), 'merge');
				const byId = new Map((await b.repo.listEvents()).map((e) => [e.id, e]));
				expect(byId.get(e1.id)?.note).toBe('from A');
				expect(byId.get(e2.id)?.note).toBe('from B');
				expect(byId.has(newEvent.id)).toBe(true);
				expect(report.events).toMatchObject({ added: 1, updated: 1, removed: 0 });
				expect(byId.get(e1.id)?.createdAt).toBe(e1.createdAt);
			});

			it('merge: a tie keeps the local record, newer settings win, device id stays', async () => {
				const a = setup(factory, 'dev-A');
				await seed(a.repo, a.time);
				const b = setup(factory, 'dev-B');
				await b.repo.importData(await a.repo.exportAll(), 'replace');
				const first = await b.repo.importData(await a.repo.exportAll(), 'merge');
				expect(first.events).toMatchObject({ added: 0, updated: 0, unchanged: 4 });
				expect(first.settings).toBe('kept-local');
				a.time.advance(3_600_000);
				const s = await a.repo.getSettings();
				await a.repo.saveSettings({ ...s, backupReminderDays: 30 });
				const second = await b.repo.importData(await a.repo.exportAll(), 'merge');
				expect(second.settings).toBe('taken-from-backup');
				const merged: AppSettings = await b.repo.getSettings();
				expect(merged.backupReminderDays).toBe(30);
				expect(merged.deviceId).toBe('dev-B');
			});

			async function rejects(
				mutate: (backup: Record<string, any>) => void, // eslint-disable-line @typescript-eslint/no-explicit-any
				code: string
			) {
				const a = setup(factory, 'dev-A');
				await seed(a.repo, a.time);
				const backup = JSON.parse(JSON.stringify(await a.repo.exportAll()));
				mutate(backup);
				const b = setup(factory, 'dev-B');
				const { cls } = await seed(b.repo, b.time);
				const before = await b.repo.exportAll();
				const err = await b.repo.importData(backup, 'replace').catch((e: unknown) => e);
				expect(err).toBeInstanceOf(BackupError);
				expect((err as BackupError).code).toBe(code);
				// Nothing changed.
				expect((await b.repo.exportAll()).data).toEqual(before.data);
				expect(cls.id).toBeTruthy();
			}

			it('rejects files that are not backups', async () => {
				await rejects((b) => (b.format = 'something else'), 'backup.badFormat');
				await rejects((b) => delete b.schemaVersion, 'backup.badFormat');
			});

			it('rejects a newer schema version', async () => {
				await rejects((b) => (b.schemaVersion = 2), 'backup.newerSchema');
			});

			it('rejects malformed records', async () => {
				await rejects((b) => (b.data.events[0].category = 'detention'), 'backup.invalid');
				await rejects((b) => (b.data.events[0].createdAt = 'yesterday'), 'backup.invalid');
				await rejects((b) => delete b.data.students[0].surname, 'backup.invalid');
				await rejects((b) => (b.data.settings.categories[0].ladder = []), 'backup.invalid');
				await rejects((b) => (b.data.events = 'nope'), 'backup.invalid');
				await rejects((b) => b.data.events.push(b.data.events[0]), 'backup.invalid');
			});

			it('rejects broken references', async () => {
				await rejects((b) => (b.data.events[0].studentId = 'ghost'), 'backup.integrity');
				await rejects((b) => (b.data.students[0].classId = 'ghost'), 'backup.integrity');
			});
		});

		describe('deleteAllData', () => {
			it('wipes data and resets settings, keeping device id and locale', async () => {
				const { repo, time } = setup(factory);
				await seed(repo, time);
				await repo.deleteAllData();
				expect(await repo.listClasses()).toEqual([]);
				expect(await repo.listStudents()).toEqual([]);
				expect(await repo.listEvents()).toEqual([]);
				const s = await repo.getSettings();
				expect(s.deviceId).toBe('dev-A');
				expect(s.locale).toBe('it');
				expect(s.categories[0].label).toBe('Behaviour');
				expect(s.lastClassId).toBeUndefined();
				expect(s.lastExportAt).toBeUndefined();
			});
		});
	});
}
