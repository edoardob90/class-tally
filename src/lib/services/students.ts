import { makeLabels, type RosterEntry, type Student } from '../domain';
import type { Repository } from '../storage';

const norm = (s: string) => s.trim().toLocaleLowerCase();
const sameStudent = (a: RosterEntry, b: RosterEntry) =>
	norm(a.name) === norm(b.name) && norm(a.surname) === norm(b.surname);

export interface PlannedStudent extends RosterEntry {
	label: string;
}

export interface StudentPlan {
	toAdd: PlannedStudent[];
	/** Entries that are already in the class (same name and surname). */
	skipped: RosterEntry[];
}

/** Decides which roster entries are new for a class and what their labels will be. */
export function planStudents(
	existing: readonly Pick<Student, 'name' | 'surname' | 'label'>[],
	entries: readonly RosterEntry[]
): StudentPlan {
	const skipped: RosterEntry[] = [];
	const fresh: RosterEntry[] = [];
	for (const entry of entries) {
		if (existing.some((s) => sameStudent(s, entry)) || fresh.some((f) => sameStudent(f, entry))) {
			skipped.push(entry);
		} else fresh.push(entry);
	}
	const labels = makeLabels([...existing, ...fresh]).slice(existing.length);
	const taken = new Set(existing.map((s) => s.label));
	const toAdd = fresh.map((entry, i) => {
		let label = labels[i];
		for (let n = 2; taken.has(label); n++) label = `${labels[i]} (${n})`;
		taken.add(label);
		return { ...entry, label };
	});
	return { toAdd, skipped };
}

export async function addStudent(
	repo: Repository,
	classId: string,
	input: { name: string; surname: string; sortKey?: string }
): Promise<Student> {
	const existing = await repo.listStudents(classId);
	const { toAdd } = planStudents(existing, [{ name: input.name, surname: input.surname }]);
	if (toAdd.length === 0) {
		const dup = existing.find((s) => sameStudent(s, input));
		if (dup) return dup;
	}
	const [created] = await repo.addStudents(classId, [{ ...toAdd[0], sortKey: input.sortKey }]);
	return created;
}

/** Renames a student; the label is regenerated ("Name + Surname initial", unique in the class). */
export async function editStudent(
	repo: Repository,
	student: Student,
	input: { name: string; surname: string; sortKey?: string }
): Promise<Student> {
	const others = (await repo.listStudents(student.classId)).filter((s) => s.id !== student.id);
	const { toAdd } = planStudents(others, [{ name: input.name, surname: input.surname }]);
	const label = toAdd[0]?.label ?? student.label;
	return repo.updateStudent(student.id, {
		name: input.name,
		surname: input.surname,
		label,
		sortKey: input.sortKey?.trim() || null
	});
}

export interface ImportItem {
	target: { kind: 'new'; name: string } | { kind: 'existing'; classId: string };
	entries: RosterEntry[];
}

export interface ImportSummary {
	classes: number;
	students: number;
	skipped: number;
	/** The class to show afterwards. */
	classId?: string;
}

/** Creates the classes and students of an import (already reviewed by the user). */
export async function importRoster(
	repo: Repository,
	items: readonly ImportItem[]
): Promise<ImportSummary> {
	const summary: ImportSummary = { classes: 0, students: 0, skipped: 0 };
	for (const item of items) {
		let classId: string;
		if (item.target.kind === 'new') {
			const created = await repo.createClass({ name: item.target.name });
			classId = created.id;
			summary.classes++;
		} else classId = item.target.classId;
		const existing = await repo.listStudents(classId);
		const { toAdd, skipped } = planStudents(existing, item.entries);
		if (toAdd.length) await repo.addStudents(classId, toAdd);
		summary.students += toAdd.length;
		summary.skipped += skipped.length;
		summary.classId ??= classId;
	}
	return summary;
}
