import { describe, expect, it } from 'vitest';
import { needsTranscription } from '../../src/lib/domain';
import {
	addStudent,
	clearCheckFlag,
	editStudent,
	importRoster,
	logEvent,
	markTranscribed,
	planStudents,
	setEventNote,
	undoLog,
	unmarkTranscribed,
	voidEvent
} from '../../src/lib/services';
import { createMemoryRepository } from '../../src/lib/storage';
import { local } from './helpers';

let n = 0;
async function world() {
	const repo = createMemoryRepository({ uuid: () => `id-${++n}`, deviceId: 'dev' });
	const cls = await repo.createClass({ name: '1AX' });
	const [s1, s2] = await repo.addStudents(cls.id, [
		{ name: 'Davide', surname: 'Acacia', label: 'Davide A.' },
		{ name: 'Rita', surname: 'Lillà', label: 'Rita L.' }
	]);
	const log = (student: string, category: 'behaviour' | 'homework', at: number) =>
		logEvent(repo, { classId: cls.id, studentId: student, category }, new Date(at));
	return { repo, cls, s1, s2, log };
}

describe('logEvent', () => {
	it('follows the ladder: verbal, register, register, note (spec worked example)', async () => {
		const { repo, s1, log } = await world();
		const e = [
			await log(s1.id, 'behaviour', local(2026, 10, 5, 10)),
			await log(s1.id, 'behaviour', local(2026, 10, 6, 10)),
			await log(s1.id, 'behaviour', local(2026, 10, 8, 10)),
			await log(s1.id, 'behaviour', local(2026, 10, 9, 10))
		];
		expect(e.map((x) => x.action)).toEqual(['verbal', 'register', 'register', 'note']);
		const wed = await log(s1.id, 'behaviour', local(2026, 10, 14, 10));
		expect(wed).toMatchObject({ countAtCreation: 3, action: 'register' });
		expect((await repo.listEvents()).length).toBe(5);
	});

	it('counts per student and per category', async () => {
		const { s1, s2, log } = await world();
		await log(s1.id, 'behaviour', local(2026, 10, 5, 10));
		const other = await log(s2.id, 'behaviour', local(2026, 10, 5, 11));
		const hw = await log(s1.id, 'homework', local(2026, 10, 5, 12));
		expect(other.countAtCreation).toBe(1);
		expect(hw.countAtCreation).toBe(1);
	});

	it('uses the settings in force and does not rewrite earlier events', async () => {
		const { repo, s1, log } = await world();
		const first = await log(s1.id, 'behaviour', local(2026, 10, 5, 10));
		const settings = await repo.getSettings();
		await repo.saveSettings({
			...settings,
			categories: settings.categories.map((c) =>
				c.id === 'behaviour' ? { ...c, ladder: [{ from: 1, action: 'note' as const }] } : c
			)
		});
		const second = await log(s1.id, 'behaviour', local(2026, 10, 5, 11));
		expect(second.action).toBe('note');
		expect((await repo.getEvent(first.id))?.action).toBe('verbal');
	});

	it('undo removes the event entirely', async () => {
		const { repo, s1, log } = await world();
		const e = await log(s1.id, 'behaviour', local(2026, 10, 5, 10));
		await undoLog(repo, e.id);
		expect(await repo.listEvents()).toEqual([]);
	});
});

describe('notes', () => {
	it('trims, limits to 200 characters and clears with an empty note', async () => {
		const { repo, s1, log } = await world();
		const e = await log(s1.id, 'behaviour', local(2026, 10, 5, 10));
		expect((await setEventNote(repo, e.id, '  Phone  ')).note).toBe('Phone');
		expect((await setEventNote(repo, e.id, 'x'.repeat(300))).note).toHaveLength(200);
		expect('note' in (await setEventNote(repo, e.id, '   '))).toBe(false);
	});
});

describe('voidEvent', () => {
	async function week() {
		const w = await world();
		const ids: string[] = [];
		for (const [d, h] of [
			[5, 10],
			[6, 10],
			[8, 10],
			[9, 10]
		]) {
			ids.push((await w.log(w.s1.id, 'behaviour', local(2026, 10, d, h))).id);
		}
		return { ...w, ids };
	}

	it('marks the event voided and recomputes later untranscribed events', async () => {
		const { repo, ids } = await week();
		const result = await voidEvent(repo, ids[1], new Date(local(2026, 10, 9, 12)));
		expect(result?.recomputed).toBe(2);
		const events = new Map((await repo.listEvents()).map((e) => [e.id, e]));
		expect(events.get(ids[1])?.voidedAt).toBeTruthy();
		expect(events.get(ids[2])).toMatchObject({ countAtCreation: 2, action: 'register' });
		expect(events.get(ids[3])).toMatchObject({ countAtCreation: 3, action: 'register' });
	});

	it('flags transcribed events whose action would change, keeping their snapshot', async () => {
		const { repo, ids } = await week();
		await markTranscribed(repo, [ids[3]]);
		await voidEvent(repo, ids[1]);
		const e = await repo.getEvent(ids[3]);
		expect(e).toMatchObject({ action: 'note', countAtCreation: 4, checkRegister: true });
		await clearCheckFlag(repo, ids[3]);
		expect((await repo.getEvent(ids[3]))?.checkRegister).toBeUndefined();
	});

	it('is a no-op for unknown or already voided events and clears a flag on the voided event', async () => {
		const { repo, ids } = await week();
		expect(await voidEvent(repo, 'nope')).toBeUndefined();
		await markTranscribed(repo, [ids[3]]);
		await voidEvent(repo, ids[1]);
		expect((await repo.getEvent(ids[3]))?.checkRegister).toBe(true);
		await voidEvent(repo, ids[3]);
		expect((await repo.getEvent(ids[3]))?.checkRegister).toBeUndefined();
		expect(await voidEvent(repo, ids[3])).toBeUndefined();
	});
});

describe('transcription', () => {
	it('marks only events that need it, and can be undone', async () => {
		const { repo, s1, log } = await world();
		const a = await log(s1.id, 'behaviour', local(2026, 10, 5, 10)); // verbal
		const b = await log(s1.id, 'behaviour', local(2026, 10, 5, 11)); // register
		const changed = await markTranscribed(repo, [a.id, b.id], new Date(local(2026, 10, 5, 12)));
		expect(changed).toEqual([b.id]);
		expect((await repo.getEvent(b.id))?.transcribedAt).toBeTruthy();
		expect(needsTranscription((await repo.getEvent(b.id))!)).toBe(false);
		await unmarkTranscribed(repo, changed);
		expect(needsTranscription((await repo.getEvent(b.id))!)).toBe(true);
	});
});

describe('students and roster import', () => {
	it('plans labels and skips students already in the class', () => {
		const plan = planStudents(
			[{ name: 'Davide', surname: 'Acacia', label: 'Davide A.' }],
			[
				{ surname: 'Acacia', name: 'Davide' },
				{ surname: 'Anemone', name: 'Davide' },
				{ surname: 'Begonia', name: 'Samuele' }
			]
		);
		expect(plan.skipped).toHaveLength(1);
		expect(plan.toAdd.map((s) => s.label)).toEqual(['Davide An.', 'Samuele B.']);
	});

	it('imports several classes, and re-importing adds nothing new', async () => {
		const repo = createMemoryRepository({ uuid: () => `r-${++n}` });
		const items = [
			{
				target: { kind: 'new' as const, name: '1AX' },
				entries: [
					{ surname: 'Acacia', name: 'Davide' },
					{ surname: 'Lillà', name: 'Rita' }
				]
			},
			{
				target: { kind: 'new' as const, name: '2BX' },
				entries: [{ surname: 'Zinnia', name: 'Quirino' }]
			}
		];
		const first = await importRoster(repo, items);
		expect(first).toMatchObject({ classes: 2, students: 3, skipped: 0 });
		const classes = await repo.listClasses();
		const again = await importRoster(
			repo,
			items.map((it, i) => ({
				...it,
				target: { kind: 'existing' as const, classId: classes[i].id }
			}))
		);
		expect(again).toMatchObject({ classes: 0, students: 0, skipped: 3 });
		expect((await repo.listStudents(classes[0].id)).map((s) => s.label)).toEqual([
			'Davide A.',
			'Rita L.'
		]);
	});

	it('adds and edits students, regenerating unique labels', async () => {
		const { repo, cls, s1 } = await world();
		const added = await addStudent(repo, cls.id, { name: 'Davide', surname: 'Anemone' });
		expect(added.label).toBe('Davide An.');
		const edited = await editStudent(repo, added, {
			name: 'Davide',
			surname: 'Begonia',
			sortKey: '  zz '
		});
		expect(edited).toMatchObject({ label: 'Davide B.', surname: 'Begonia', sortKey: 'zz' });
		const cleared = await editStudent(repo, edited, { name: 'Davide', surname: 'Begonia' });
		expect('sortKey' in cleared).toBe(false);
		expect((await repo.getEvent('x')) === undefined && s1.id).toBeTruthy();
	});
});
