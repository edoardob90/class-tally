import { SCHEMA_VERSION } from '../domain';

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;

type Step = (backup: Record<string, unknown>) => Record<string, unknown>;

/**
 * Backup migrations: `STEPS[n]` turns a version-n backup into a version-(n+1) backup.
 * Version 1 is the first release, so there is nothing to migrate yet. The IndexedDB schema itself
 * is versioned with Dexie's `version(n).upgrade()` in `dexie.ts`.
 */
const STEPS: Record<number, Step> = {};

export function migrateBackup(
	backup: Record<string, unknown>,
	from: number,
	to: number = CURRENT_SCHEMA_VERSION,
	steps: Record<number, Step> = STEPS
): Record<string, unknown> {
	let current = backup;
	for (let v = from; v < to; v++) {
		const step = steps[v];
		if (!step) throw new Error(`No migration from schema version ${v}`);
		current = { ...step(current), schemaVersion: v + 1 };
	}
	return current;
}
