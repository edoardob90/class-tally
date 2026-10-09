import { describe, expect, it } from 'vitest';
import { backupReminder } from '../../src/lib/domain';
import { BackupError, createMemoryRepository } from '../../src/lib/storage';
import {
	applyBackup,
	createBackupFile,
	createCsvFile,
	logEvent,
	markExported,
	previewBackup
} from '../../src/lib/services';
import { local } from './helpers';

const day = (d: number, h = 10) => new Date(local(2026, 10, d, h)).toISOString();

describe('backupReminder', () => {
	it('is off when the interval is 0 or when there is nothing to back up', () => {
		const now = local(2026, 10, 20);
		expect(backupReminder({ backupReminderDays: 0 }, day(1), now).due).toBe(false);
		expect(backupReminder({ backupReminderDays: 7 }, undefined, now).due).toBe(false);
	});

	it('starts counting at the first event when there was never an export', () => {
		const r = backupReminder({ backupReminderDays: 7 }, day(1), local(2026, 10, 9, 10));
		expect(r).toMatchObject({ due: true, never: true, daysSince: 8 });
		expect(backupReminder({ backupReminderDays: 7 }, day(5), local(2026, 10, 9, 10)).due).toBe(
			false
		);
	});

	it('counts from the last export and is due exactly after the interval', () => {
		const settings = { backupReminderDays: 7, lastExportAt: day(2) };
		expect(backupReminder(settings, day(1), local(2026, 10, 9, 9, 59)).due).toBe(false);
		expect(backupReminder(settings, day(1), local(2026, 10, 9, 10)).due).toBe(true);
		expect(backupReminder(settings, day(1), local(2026, 10, 9, 10)).never).toBe(false);
	});
});

describe('data services', () => {
	async function repoWithData() {
		const repo = createMemoryRepository({ deviceId: 'dev' });
		const cls = await repo.createClass({ name: '1AX' });
		const [s] = await repo.addStudents(cls.id, [
			{ name: 'Davide', surname: 'Acacia', label: 'Davide A.' }
		]);
		await logEvent(repo, { classId: cls.id, studentId: s.id, category: 'behaviour' }, new Date());
		return repo;
	}

	it('creates dated file names and contents', async () => {
		const repo = await repoWithData();
		const now = new Date(local(2026, 10, 9, 12));
		const json = await createBackupFile(repo, now);
		const csv = await createCsvFile(repo, now);
		expect(json.filename).toBe('class-tally-backup-2026-10-09.json');
		expect(csv.filename).toBe('class-tally-events-2026-10-09.csv');
		expect(JSON.parse(json.text).format).toBe('class-tally-backup');
		expect(csv.text.split('\r\n')[1]).toContain('1AX,Davide A.,behaviour');
	});

	it('remembers the export time', async () => {
		const repo = await repoWithData();
		await markExported(repo, new Date('2026-10-09T10:00:00.000Z'));
		expect((await repo.getSettings()).lastExportAt).toBe('2026-10-09T10:00:00.000Z');
	});

	it('previews both import modes without changing anything, then applies one', async () => {
		const source = await repoWithData();
		const text = (await createBackupFile(source)).text;
		const target = createMemoryRepository({ deviceId: 'other' });
		const preview = await previewBackup(target, text);
		expect(preview.merge.events).toMatchObject({ added: 1 });
		expect(preview.replace.events).toMatchObject({ added: 1, removed: 0 });
		expect(await target.listEvents()).toEqual([]);
		await applyBackup(target, preview.backup, 'merge');
		expect((await target.listEvents()).length).toBe(1);
		await expect(previewBackup(target, 'nope')).rejects.toBeInstanceOf(BackupError);
	});
});
