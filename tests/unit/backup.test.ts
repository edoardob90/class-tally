import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../src/lib/domain';
import {
	BACKUP_FORMAT,
	BackupError,
	buildBackup,
	defaultUuid,
	migrateBackup,
	parseBackup,
	parseBackupText
} from '../../src/lib/storage';

const NOW = '2026-10-09T10:00:00.000Z';

function minimal() {
	return buildBackup(
		{ settings: defaultSettings('dev', NOW), classes: [], students: [], events: [] },
		NOW
	);
}

describe('parseBackup', () => {
	it('accepts an empty but valid backup', () => {
		expect(parseBackup(JSON.parse(JSON.stringify(minimal())))).toEqual(minimal());
	});

	it('reports text that is not JSON', () => {
		expect(() => parseBackupText('{ not json')).toThrowError(BackupError);
		try {
			parseBackupText('hello');
		} catch (e) {
			expect((e as BackupError).code).toBe('backup.notJson');
		}
	});

	it('copies only known fields', () => {
		const raw = JSON.parse(JSON.stringify(minimal()));
		raw.extra = 1;
		raw.data.settings.sneaky = true;
		raw.data.classes.push({
			id: 'c',
			name: 'A',
			archived: false,
			createdAt: NOW,
			updatedAt: NOW,
			admin: true
		});
		const parsed = parseBackup(raw);
		expect('extra' in parsed).toBe(false);
		expect('sneaky' in parsed.data.settings).toBe(false);
		expect('admin' in parsed.data.classes[0]).toBe(false);
	});

	it('rejects non-objects and the wrong format', () => {
		for (const bad of [null, 5, 'x', [], { format: 'nope' }]) {
			expect(() => parseBackup(bad)).toThrowError(BackupError);
		}
		expect(minimal().format).toBe(BACKUP_FORMAT);
	});
});

describe('migrateBackup', () => {
	it('applies the steps in order and stamps the version', () => {
		const steps = {
			1: (b: Record<string, unknown>) => ({
				...b,
				trail: [...((b.trail as string[]) ?? []), '1to2']
			}),
			2: (b: Record<string, unknown>) => ({
				...b,
				trail: [...((b.trail as string[]) ?? []), '2to3']
			})
		};
		const out = migrateBackup({ schemaVersion: 1 }, 1, 3, steps);
		expect(out).toEqual({ schemaVersion: 3, trail: ['1to2', '2to3'] });
	});

	it('is the identity when already current, and fails loudly on a missing step', () => {
		expect(migrateBackup({ a: 1 }, 1, 1)).toEqual({ a: 1 });
		expect(() => migrateBackup({}, 1, 2, {})).toThrow();
	});
});

describe('defaultUuid', () => {
	it('works without crypto.randomUUID (insecure contexts)', () => {
		vi.stubGlobal('crypto', {
			getRandomValues: (b: Uint8Array) => {
				b.forEach((_, i) => (b[i] = (i * 17 + 3) % 256));
				return b;
			}
		});
		try {
			expect(defaultUuid()).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
			);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('produces distinct ids', () => {
		expect(defaultUuid()).not.toBe(defaultUuid());
	});
});
