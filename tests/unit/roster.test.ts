import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	makeLabels,
	parseRoster,
	RosterError,
	sortStudents,
	splitFullName
} from '../../src/lib/domain';

const fixture = readFileSync('fixtures/example-roster.json', 'utf8');

describe('splitFullName', () => {
	it('takes the first word as the surname', () => {
		expect(splitFullName('Acacia Davide')).toEqual({ surname: 'Acacia', name: 'Davide' });
		expect(splitFullName("  Dell'Oro   Anna Maria ")).toEqual({
			surname: "Dell'Oro",
			name: 'Anna Maria'
		});
	});

	it('understands "Surname, Name" and single words', () => {
		expect(splitFullName('De Luca, Anna')).toEqual({ surname: 'De Luca', name: 'Anna' });
		expect(splitFullName('Chiara')).toEqual({ surname: '', name: 'Chiara' });
		expect(splitFullName('   ')).toEqual({ surname: '', name: '' });
	});
});

describe('parseRoster', () => {
	it('reads the single-class format and ignores id and weight', () => {
		const text = JSON.stringify({
			class: '1FT',
			students: [
				{ id: '1FT-01', name: 'Acacia Davide', weight: 1 },
				{ id: '1FT-08', name: 'Gardenia Aurora', weight: 0 },
				{ id: '1FT-14', name: 'Lillà Rita', weight: 1 }
			]
		});
		const { classes } = parseRoster(text);
		expect(classes).toHaveLength(1);
		expect(classes[0].name).toBe('1FT');
		expect(classes[0].entries).toEqual([
			{ surname: 'Acacia', name: 'Davide' },
			{ surname: 'Gardenia', name: 'Aurora' },
			{ surname: 'Lillà', name: 'Rita' }
		]);
	});

	it('accepts explicit name and surname fields', () => {
		const { classes } = parseRoster(
			JSON.stringify({ class: 'X', students: [{ name: 'Davide', surname: 'Acacia' }] })
		);
		expect(classes[0].entries).toEqual([{ surname: 'Acacia', name: 'Davide' }]);
	});

	it('reads the example fixture: three classes of about 20 students', () => {
		const { classes } = parseRoster(fixture);
		expect(classes.map((c) => c.name)).toEqual(['1AX', '2BX', '3CX']);
		for (const c of classes) {
			expect(c.entries.length).toBeGreaterThanOrEqual(19);
			expect(c.entries.length).toBeLessThanOrEqual(21);
		}
	});

	it('reads an array of classes and plain lines', () => {
		expect(parseRoster('[{"class":"A","students":[{"name":"Rossi Anna"}]}]').classes).toHaveLength(
			1
		);
		const { classes } = parseRoster('Acacia Davide\n\nAnemone Ludovica\r\nCamelia Zeno\n');
		expect(classes[0].name).toBeUndefined();
		expect(classes[0].entries.map((e) => e.name)).toEqual(['Davide', 'Ludovica', 'Zeno']);
	});

	it.each([
		['', 'roster.empty'],
		['{ nope', 'roster.invalidJson'],
		['{"students": []}', 'roster.noStudents'],
		['{"foo": 1}', 'roster.noStudents'],
		['{"format":"class-tally-backup","data":{}}', 'roster.isBackup']
	])('rejects %j with %s', (text, code) => {
		expect(() => parseRoster(text)).toThrowError(RosterError);
		try {
			parseRoster(text);
		} catch (e) {
			expect((e as RosterError).code).toBe(code);
		}
	});
});

describe('makeLabels', () => {
	it('uses the name plus the initial of the surname', () => {
		expect(makeLabels([{ surname: 'Acacia', name: 'Davide' }])).toEqual(['Davide A.']);
		expect(makeLabels([{ surname: 'Lillà', name: 'Rita' }])).toEqual(['Rita L.']);
		expect(makeLabels([{ surname: '', name: 'Chiara' }])).toEqual(['Chiara']);
		expect(makeLabels([{ surname: 'Rossi', name: '' }])).toEqual(['Rossi']);
	});

	it('lengthens the initial on collisions, then numbers true duplicates', () => {
		expect(
			makeLabels([
				{ surname: 'Acacia', name: 'Davide' },
				{ surname: 'Anemone', name: 'Davide' },
				{ surname: 'Begonia', name: 'Davide' }
			])
		).toEqual(['Davide Ac.', 'Davide An.', 'Davide B.']);
		expect(
			makeLabels([
				{ surname: 'Rossi', name: 'Anna' },
				{ surname: 'Rossi', name: 'Anna' }
			])
		).toEqual(['Anna R.', 'Anna R. (2)']);
	});

	it('generates the labels of the whole fixture without duplicates', () => {
		for (const c of parseRoster(fixture).classes) {
			const labels = makeLabels(c.entries);
			expect(new Set(labels).size).toBe(labels.length);
		}
	});
});

describe('sortStudents', () => {
	const collator = new Intl.Collator('it', { numeric: true, sensitivity: 'base' });
	const s = (id: string, surname: string, name: string, extra: object = {}) => ({
		id,
		surname,
		name,
		label: `${name} ${surname[0]}.`,
		...extra
	});

	it('orders by surname then name, as in the register', () => {
		const sorted = sortStudents(
			[s('3', 'Begonia', 'Samuele'), s('1', 'Acacia', 'Davide'), s('2', 'Acacia', 'Anna')],
			collator
		);
		expect(sorted.map((x) => x.id)).toEqual(['2', '1', '3']);
	});

	it('uses the sort key when set and falls back to the label without a surname', () => {
		const sorted = sortStudents(
			[
				s('1', 'Zinnia', 'Quirino', { sortKey: '0 first' }),
				s('2', 'Acacia', 'Davide'),
				{ id: '3', surname: '', name: '', label: 'Bruno' }
			],
			collator
		);
		expect(sorted.map((x) => x.id)).toEqual(['1', '2', '3']);
	});

	it('does not mutate its input', () => {
		const input = [s('2', 'B', 'x'), s('1', 'A', 'y')];
		sortStudents(input, collator);
		expect(input.map((x) => x.id)).toEqual(['2', '1']);
	});
});
