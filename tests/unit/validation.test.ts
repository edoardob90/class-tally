import { describe, expect, it } from 'vitest';
import {
	defaultCategory,
	defaultSettings,
	validateCategory,
	validateLadder,
	validateSettings,
	type CategorySettings,
	type LadderStep
} from '../../src/lib/domain';

const codes = (l: unknown[]) => validateLadder(l as LadderStep[]).map((i) => i.code);

describe('validateLadder', () => {
	it('accepts valid ladders, with or without a note step', () => {
		expect(
			codes([
				{ from: 1, action: 'verbal' },
				{ from: 2, action: 'register' },
				{ from: 4, action: 'note' }
			])
		).toEqual([]);
		expect(codes([{ from: 1, action: 'register' }])).toEqual([]);
	});

	it.each([
		['empty', [], 'ladder.empty'],
		['first step not 1', [{ from: 2, action: 'verbal' }], 'ladder.firstNotOne'],
		[
			'duplicate from',
			[
				{ from: 1, action: 'verbal' },
				{ from: 1, action: 'register' }
			],
			'ladder.notIncreasing'
		],
		[
			'descending',
			[
				{ from: 1, action: 'verbal' },
				{ from: 4, action: 'register' },
				{ from: 3, action: 'note' }
			],
			'ladder.notIncreasing'
		],
		['zero', [{ from: 0, action: 'verbal' }], 'ladder.fromRange'],
		['negative', [{ from: -1, action: 'verbal' }], 'ladder.fromRange'],
		[
			'too large',
			[
				{ from: 1, action: 'verbal' },
				{ from: 1001, action: 'note' }
			],
			'ladder.fromRange'
		],
		['fraction', [{ from: 1.5, action: 'verbal' }], 'ladder.notInteger'],
		['not a number', [{ from: '1', action: 'verbal' }], 'ladder.notInteger'],
		['unknown action', [{ from: 1, action: 'detention' }], 'ladder.badAction']
	])('rejects %s', (_name, ladder, code) => {
		expect(codes(ladder)).toContain(code);
	});

	it('reports the path of the offending step', () => {
		const issues = validateLadder([
			{ from: 1, action: 'verbal' },
			{ from: 1, action: 'register' }
		]);
		expect(issues[0].path).toBe('ladder[1].from');
	});
});

describe('validateCategory', () => {
	const ok = defaultCategory('behaviour');
	const bad = (over: Partial<CategorySettings>) =>
		validateCategory({ ...ok, ...over }).map((i) => i.code);

	it('accepts the defaults', () => {
		for (const id of ['behaviour', 'homework', 'materials'] as const) {
			expect(validateCategory(defaultCategory(id))).toEqual([]);
		}
	});

	it.each([
		[0, 'window.range'],
		[366, 'window.range'],
		[-3, 'window.range'],
		[1.5, 'window.integer'],
		[Number.NaN, 'window.integer']
	])('rejects a window of %s days', (windowDays, code) => {
		expect(bad({ windowDays })).toContain(code);
	});

	it('accepts the window limits 1 and 365', () => {
		expect(bad({ windowDays: 1 })).toEqual([]);
		expect(bad({ windowDays: 365 })).toEqual([]);
	});

	it('checks label and quick notes', () => {
		expect(bad({ label: '   ' })).toContain('label.empty');
		expect(bad({ label: 'x'.repeat(31) })).toContain('label.tooLong');
		expect(bad({ quickNotes: ['x'.repeat(201)] })).toContain('quickNote.tooLong');
		expect(bad({ quickNotes: [''] })).toContain('quickNote.empty');
		expect(bad({ quickNotes: Array.from({ length: 9 }, (_, i) => `n${i}`) })).toContain(
			'quickNote.tooMany'
		);
	});
});

describe('validateSettings', () => {
	const base = () => defaultSettings('dev', '2026-10-09T00:00:00.000Z');

	it('accepts the defaults', () => {
		expect(validateSettings(base())).toEqual([]);
	});

	it('rejects missing categories, a bad reminder interval and an unknown locale', () => {
		const s = base();
		s.categories = s.categories.slice(1);
		expect(validateSettings(s).map((i) => i.code)).toContain('categories.invalid');
		expect(validateSettings({ ...base(), backupReminderDays: -1 }).map((i) => i.code)).toContain(
			'backup.interval'
		);
		expect(validateSettings({ ...base(), backupReminderDays: 366 }).map((i) => i.code)).toContain(
			'backup.interval'
		);
		expect(validateSettings({ ...base(), backupReminderDays: 0 })).toEqual([]);
		expect(validateSettings({ ...base(), locale: 'fr' as 'en' }).map((i) => i.code)).toContain(
			'locale.invalid'
		);
	});
});
