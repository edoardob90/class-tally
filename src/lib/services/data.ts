import { fileStamp } from '../domain';
import {
	eventsToCsv,
	parseBackupText,
	planImport,
	type BackupData,
	type ImportMode,
	type ImportReport,
	type Repository
} from '../storage';

export interface ExportFile {
	filename: string;
	mime: string;
	text: string;
}

/** The full backup as a JSON file (every record with all its fields). */
export async function createBackupFile(
	repo: Repository,
	now: Date = new Date()
): Promise<ExportFile> {
	const backup = await repo.exportAll();
	return {
		filename: `class-tally-backup-${fileStamp(now.getTime())}.json`,
		mime: 'application/json',
		text: JSON.stringify(backup, null, 2)
	};
}

/** All events as CSV. */
export async function createCsvFile(repo: Repository, now: Date = new Date()): Promise<ExportFile> {
	const [events, classes, students] = await Promise.all([
		repo.listEvents(),
		repo.listClasses(),
		repo.listStudents()
	]);
	return {
		filename: `class-tally-events-${fileStamp(now.getTime())}.csv`,
		mime: 'text/csv',
		text: eventsToCsv(events, { classes, students })
	};
}

/** Remembers that an export happened (drives the backup reminder). */
export async function markExported(repo: Repository, now: Date = new Date()): Promise<void> {
	const settings = await repo.getSettings();
	await repo.saveSettings({ ...settings, lastExportAt: now.toISOString() });
}

export interface ImportPreview {
	backup: BackupData;
	merge: ImportReport;
	replace: ImportReport;
}

/** Parses a backup file and shows what each import mode would do, without changing anything. */
export async function previewBackup(repo: Repository, text: string): Promise<ImportPreview> {
	const backup = parseBackupText(text);
	const local = await repo.exportAll();
	return {
		backup,
		merge: planImport(local.data, backup.data, 'merge').report,
		replace: planImport(local.data, backup.data, 'replace').report
	};
}

export function applyBackup(
	repo: Repository,
	backup: BackupData,
	mode: ImportMode
): Promise<ImportReport> {
	return repo.importData(backup, mode);
}
