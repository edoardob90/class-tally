import type { Student } from './types';

export interface RosterEntry {
	surname: string;
	name: string;
}

export interface RosterClass {
	/** Class name from the file, if any (pasted lines have none). */
	name?: string;
	entries: RosterEntry[];
}

export interface RosterPreview {
	classes: RosterClass[];
}

export type RosterErrorCode =
	'roster.empty' | 'roster.invalidJson' | 'roster.noStudents' | 'roster.isBackup';

export class RosterError extends Error {
	constructor(readonly code: RosterErrorCode) {
		super(code);
		this.name = 'RosterError';
	}
}

/**
 * Splits a full name written "Surname Given-name" (the register order): the first word is the
 * surname, the rest is the given name. "Surname, Given name" is also understood. A single word
 * is taken as a given name.
 */
export function splitFullName(full: string): RosterEntry {
	const text = full.replace(/\s+/g, ' ').trim();
	if (text === '') return { surname: '', name: '' };
	const comma = text.indexOf(',');
	if (comma > 0) {
		return { surname: text.slice(0, comma).trim(), name: text.slice(comma + 1).trim() };
	}
	const space = text.indexOf(' ');
	if (space < 0) return { surname: '', name: text };
	return { surname: text.slice(0, space), name: text.slice(space + 1) };
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function entryFromJson(v: unknown): RosterEntry | undefined {
	if (typeof v === 'string') return splitFullName(v);
	if (!isRecord(v)) return undefined;
	const name = typeof v.name === 'string' ? v.name : '';
	if (typeof v.surname === 'string') {
		return { surname: v.surname.trim(), name: name.trim() };
	}
	return name ? splitFullName(name) : undefined;
}

function classFromJson(v: unknown): RosterClass | undefined {
	if (!isRecord(v) || !Array.isArray(v.students)) return undefined;
	const entries = v.students
		.map(entryFromJson)
		.filter((e): e is RosterEntry => !!e && (e.name !== '' || e.surname !== ''));
	const name = typeof v.class === 'string' && v.class.trim() ? v.class.trim() : undefined;
	return { name, entries };
}

/**
 * Parses a pasted or loaded roster. Accepted:
 * - one class: `{ "class": "1AX", "students": [{ "name": "Surname Name" }] }` (extra fields such as
 *   `id` and `weight` are ignored; entries may also have separate `name` and `surname`);
 * - several classes: `{ "classes": [ ...one-class objects ] }` or an array of one-class objects;
 * - plain text, one "Surname Name" per line.
 */
export function parseRoster(text: string): RosterPreview {
	const trimmed = text.trim();
	if (trimmed === '') throw new RosterError('roster.empty');
	let classes: RosterClass[];
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		let json: unknown;
		try {
			json = JSON.parse(trimmed);
		} catch {
			throw new RosterError('roster.invalidJson');
		}
		if (isRecord(json) && json.format === 'class-tally-backup') {
			throw new RosterError('roster.isBackup');
		}
		const list: unknown[] = Array.isArray(json)
			? json
			: isRecord(json) && Array.isArray(json.classes)
				? json.classes
				: [json];
		classes = list.map(classFromJson).filter((c): c is RosterClass => !!c);
	} else {
		const entries = trimmed
			.split(/\r?\n/)
			.map((l) => splitFullName(l))
			.filter((e) => e.name !== '' || e.surname !== '');
		classes = [{ entries }];
	}
	classes = classes.filter((c) => c.entries.length > 0);
	if (classes.length === 0) throw new RosterError('roster.noStudents');
	return { classes };
}

function firstLetters(text: string, count: number): string {
	const letters = Array.from(text.trim());
	if (letters.length === 0) return '';
	const head = letters.slice(0, count);
	return head[0].toLocaleUpperCase() + head.slice(1).join('');
}

function labelWith(entry: RosterEntry, initialLength: number): string {
	const name = entry.name.trim();
	const surname = entry.surname.trim();
	if (!surname) return name;
	if (!name) return surname;
	return `${name} ${firstLetters(surname, initialLength)}.`;
}

/**
 * "Name + Surname initial" labels, e.g. "Davide A.". When two students would get the same label
 * the initial grows ("Davide Ac."); identical name and surname get " (2)", " (3)", ...
 */
export function makeLabels(people: readonly RosterEntry[]): string[] {
	const labels = people.map((p) => labelWith(p, 1));
	const groups = new Map<string, number[]>();
	labels.forEach((l, i) => groups.set(l, [...(groups.get(l) ?? []), i]));
	for (const idx of groups.values()) {
		if (idx.length < 2) continue;
		const maxLen = Math.max(...idx.map((i) => Array.from(people[i].surname.trim()).length));
		let resolved = false;
		for (let k = 2; k <= maxLen && !resolved; k++) {
			const trial = idx.map((i) => labelWith(people[i], k));
			if (new Set(trial).size === trial.length) {
				idx.forEach((i, j) => (labels[i] = trial[j]));
				resolved = true;
			}
		}
		if (resolved) continue;
		// Identical name and surname: number them.
		const seen = new Map<string, number>();
		for (const i of idx) {
			const n = (seen.get(labels[i]) ?? 0) + 1;
			seen.set(labels[i], n);
			if (n > 1) labels[i] = `${labels[i]} (${n})`;
		}
	}
	return labels;
}

/** Key used for ordering: the explicit sort key, else "surname name", else the label. */
export function sortKeyOf(s: Pick<Student, 'sortKey' | 'surname' | 'name' | 'label'>): string {
	if (s.sortKey) return s.sortKey;
	if (s.surname) return `${s.surname} ${s.name}`.trim();
	return s.label;
}

export function sortStudents<
	T extends Pick<Student, 'id' | 'sortKey' | 'surname' | 'name' | 'label'>
>(students: readonly T[], collator: Intl.Collator): T[] {
	return [...students].sort(
		(a, b) =>
			collator.compare(sortKeyOf(a), sortKeyOf(b)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
	);
}
