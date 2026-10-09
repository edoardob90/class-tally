import { LIMITS } from './limits';
import type { AppSettings, CategorySettings, LadderStep } from './types';
import { ACTIONS, CATEGORY_IDS, LOCALES } from './types';

export type IssueCode =
	| 'window.integer'
	| 'window.range'
	| 'ladder.empty'
	| 'ladder.notInteger'
	| 'ladder.fromRange'
	| 'ladder.firstNotOne'
	| 'ladder.notIncreasing'
	| 'ladder.badAction'
	| 'label.empty'
	| 'label.tooLong'
	| 'quickNote.empty'
	| 'quickNote.tooLong'
	| 'quickNote.tooMany'
	| 'backup.interval'
	| 'categories.invalid'
	| 'locale.invalid';

export interface Issue {
	code: IssueCode;
	/** Where the problem is, e.g. `categories[0].ladder[2].from`. */
	path: string;
	params?: Record<string, number | string>;
}

export function validateLadder(ladder: readonly LadderStep[], path = 'ladder'): Issue[] {
	const issues: Issue[] = [];
	if (!Array.isArray(ladder) || ladder.length === 0) {
		return [{ code: 'ladder.empty', path }];
	}
	let prev = 0;
	ladder.forEach((step, i) => {
		const at = `${path}[${i}]`;
		if (!ACTIONS.includes(step?.action)) {
			issues.push({ code: 'ladder.badAction', path: `${at}.action` });
		}
		const from = step?.from;
		if (typeof from !== 'number' || !Number.isInteger(from)) {
			issues.push({ code: 'ladder.notInteger', path: `${at}.from` });
			return;
		}
		if (from < 1 || from > LIMITS.ladderFromMax) {
			issues.push({
				code: 'ladder.fromRange',
				path: `${at}.from`,
				params: { max: LIMITS.ladderFromMax }
			});
			return;
		}
		if (i === 0 && from !== 1) {
			issues.push({ code: 'ladder.firstNotOne', path: `${at}.from` });
		} else if (i > 0 && from <= prev) {
			issues.push({ code: 'ladder.notIncreasing', path: `${at}.from`, params: { previous: prev } });
		}
		prev = from;
	});
	return issues;
}

export function validateCategory(c: CategorySettings, path = 'category'): Issue[] {
	const issues: Issue[] = [];
	const w = c.windowDays;
	if (typeof w !== 'number' || !Number.isInteger(w)) {
		issues.push({ code: 'window.integer', path: `${path}.windowDays` });
	} else if (w < LIMITS.windowDaysMin || w > LIMITS.windowDaysMax) {
		issues.push({
			code: 'window.range',
			path: `${path}.windowDays`,
			params: { min: LIMITS.windowDaysMin, max: LIMITS.windowDaysMax }
		});
	}
	issues.push(...validateLadder(c.ladder, `${path}.ladder`));
	const label = (c.label ?? '').trim();
	if (label.length === 0) issues.push({ code: 'label.empty', path: `${path}.label` });
	else if (label.length > LIMITS.labelMax) {
		issues.push({ code: 'label.tooLong', path: `${path}.label`, params: { max: LIMITS.labelMax } });
	}
	const notes = c.quickNotes ?? [];
	if (notes.length > LIMITS.quickNotesMax) {
		issues.push({
			code: 'quickNote.tooMany',
			path: `${path}.quickNotes`,
			params: { max: LIMITS.quickNotesMax }
		});
	}
	notes.forEach((n, i) => {
		const t = n.trim();
		if (t.length === 0) issues.push({ code: 'quickNote.empty', path: `${path}.quickNotes[${i}]` });
		else if (t.length > LIMITS.noteMax) {
			issues.push({
				code: 'quickNote.tooLong',
				path: `${path}.quickNotes[${i}]`,
				params: { max: LIMITS.noteMax }
			});
		}
	});
	return issues;
}

export function validateSettings(s: AppSettings): Issue[] {
	const issues: Issue[] = [];
	const ids = (s.categories ?? []).map((c) => c.id);
	const complete =
		ids.length === CATEGORY_IDS.length && CATEGORY_IDS.every((id) => ids.includes(id));
	if (!complete) issues.push({ code: 'categories.invalid', path: 'categories' });
	(s.categories ?? []).forEach((c, i) => issues.push(...validateCategory(c, `categories[${i}]`)));
	const d = s.backupReminderDays;
	if (!Number.isInteger(d) || d < 0 || d > LIMITS.backupReminderDaysMax) {
		issues.push({
			code: 'backup.interval',
			path: 'backupReminderDays',
			params: { max: LIMITS.backupReminderDaysMax }
		});
	}
	if (!LOCALES.includes(s.locale)) issues.push({ code: 'locale.invalid', path: 'locale' });
	return issues;
}
