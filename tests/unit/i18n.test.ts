import { describe, expect, it } from 'vitest';
import { defaultCategory, CATEGORY_IDS } from '../../src/lib/domain';
import {
	DEFAULT_QUICK_NOTE_KEYS,
	categoryLabel,
	createTranslator,
	en,
	flattenMessages,
	isPlural,
	it as itMessages,
	placeholdersOf,
	quickNotesFor,
	type Dictionaries
} from '../../src/lib/i18n';

const dictionaries: Dictionaries = { en, it: itMessages };
const flatEn = flattenMessages(en);
const flatIt = flattenMessages(itMessages);

describe('message files', () => {
	it('have exactly the same keys', () => {
		expect([...flatIt.keys()].sort()).toEqual([...flatEn.keys()].sort());
	});

	it('use the same placeholders in every string', () => {
		const problems: string[] = [];
		for (const [key, enLeaf] of flatEn) {
			const itLeaf = flatIt.get(key)!;
			const forms = (leaf: string | { one: string; other: string }) =>
				typeof leaf === 'string' ? { text: leaf } : leaf;
			const e = forms(enLeaf) as Record<string, string>;
			const i = forms(itLeaf) as Record<string, string>;
			for (const form of Object.keys(e)) {
				const a = placeholdersOf(e[form]).join(',');
				const b = placeholdersOf(i[form] ?? '').join(',');
				if (a !== b) problems.push(`${key}.${form}: en {${a}} vs it {${b}}`);
			}
		}
		expect(problems).toEqual([]);
	});

	it('use the same shape (string or plural pair) for every key', () => {
		for (const [key, enLeaf] of flatEn) {
			expect(isPlural(flatIt.get(key)), key).toBe(isPlural(enLeaf));
		}
	});

	it('plural strings of both locales mention {count}', () => {
		for (const flat of [flatEn, flatIt]) {
			for (const [key, leaf] of flat) {
				if (isPlural(leaf)) {
					expect(placeholdersOf(leaf.one), key).toContain('count');
					expect(placeholdersOf(leaf.other), key).toContain('count');
				}
			}
		}
	});

	it('have no empty strings, stray whitespace or em dashes', () => {
		for (const [name, flat] of [
			['en', flatEn],
			['it', flatIt]
		] as const) {
			for (const [key, leaf] of flat) {
				const texts = typeof leaf === 'string' ? [leaf] : [leaf.one, leaf.other];
				for (const text of texts) {
					expect(text.trim(), `${name}:${key}`).not.toBe('');
					expect(text, `${name}:${key}`).toBe(text.trim());
					expect(text, `${name}:${key}`).not.toContain(String.fromCharCode(0x2014));
				}
			}
		}
	});

	it('use the register glossary in Italian', () => {
		const get = (k: string) => flatIt.get(k);
		expect(get('categories.behaviour')).toBe('Comportamento');
		expect(get('categories.homework')).toBe('Compiti');
		expect(get('categories.materials')).toBe('Materiale');
		expect(get('actions.verbal')).toBe('Avviso verbale');
		expect(get('actions.register')).toBe('Richiamo sul registro');
		expect(get('actions.note')).toBe('Nota disciplinare');
		expect(get('transcribe.title')).toBe('Da trascrivere');
		expect(get('history.transcribed')).toBe('Trascritto');
	});
});

describe('t()', () => {
	const tEn = createTranslator(dictionaries, 'en');
	const tIt = createTranslator(dictionaries, 'it');

	it('returns plain strings and interpolates named placeholders', () => {
		expect(tEn('nav.history')).toBe('History');
		expect(tIt('nav.history')).toBe('Storico');
		expect(
			tEn('toast.logged', {
				student: 'Davide A.',
				category: 'Behaviour',
				count: 2,
				action: 'Register entry'
			})
		).toBe('Davide A. – Behaviour #2 – Register entry');
		expect(
			tIt('toast.logged', {
				student: 'Rita L.',
				category: 'Compiti',
				count: 3,
				action: 'Nota disciplinare'
			})
		).toBe('Rita L. – Compiti n. 3 – Nota disciplinare');
	});

	it('picks the plural form with Intl.PluralRules', () => {
		expect(tEn('common.days', { count: 1 })).toBe('1 day');
		expect(tEn('common.days', { count: 0 })).toBe('0 days');
		expect(tEn('common.days', { count: 7 })).toBe('7 days');
		expect(tIt('common.days', { count: 1 })).toBe('1 giorno');
		expect(tIt('common.days', { count: 0 })).toBe('0 giorni');
		expect(tIt('common.days', { count: 30 })).toBe('30 giorni');
		expect(tIt('transcribe.pending', { count: 1 })).toBe('1 evento da trascrivere');
		expect(tIt('transcribe.pending', { count: 5 })).toBe('5 eventi da trascrivere');
	});

	it('falls back to English for a missing Italian key, then to the key', () => {
		const partial = { en, it: { ...itMessages, nav: { ...itMessages.nav, history: undefined } } };
		const missing: string[] = [];
		const t = createTranslator(partial as unknown as Dictionaries, 'it', {
			onMissing: (k) => missing.push(k)
		});
		expect(t('nav.history')).toBe('History');
		expect(missing).toEqual(['nav.history']);
		expect((t as unknown as (k: string) => string)('does.not.exist')).toBe('does.not.exist');
	});

	it('leaves unknown placeholders untouched', () => {
		const t = createTranslator(dictionaries, 'en');
		expect(
			(t as unknown as (k: string, p: object) => string)('sheet.next', { category: 'X' })
		).toBe('X – next: {action}');
	});

	it('is typed: only valid keys, parameters exactly when needed', () => {
		// These lines only matter to the type checker (`npm run check`); they are not executed.
		const typeChecks = () => {
			// @ts-expect-error unknown key
			tEn('nav.nope');
			// @ts-expect-error missing parameters
			tEn('toast.logged');
			// @ts-expect-error a missing placeholder
			tEn('sheet.next', { category: 'x' });
			// @ts-expect-error plural strings need a count
			tEn('common.days', {});
			// @ts-expect-error a string without placeholders takes no parameters
			tEn('nav.history', { x: 1 });
			tEn('common.days', { count: 2 });
			tEn('nav.history');
		};
		expect(typeChecks).toBeTypeOf('function');
	});
});

describe('defaults match the domain', () => {
	it('English category labels and quick notes equal the stored defaults', () => {
		const tEn = createTranslator(dictionaries, 'en');
		for (const id of CATEGORY_IDS) {
			const cat = defaultCategory(id);
			expect(tEn(`categories.${id}`)).toBe(cat.label);
			expect(DEFAULT_QUICK_NOTE_KEYS[id].map((k) => tEn(k as never))).toEqual(cat.quickNotes);
		}
	});

	it('shows locale defaults until edited, then the stored values', () => {
		const tIt = createTranslator(dictionaries, 'it');
		const cat = defaultCategory('homework');
		expect(categoryLabel(cat, tIt)).toBe('Compiti');
		expect(quickNotesFor(cat, tIt)[0]).toBe('Non fatti');
		const edited = {
			...cat,
			label: 'Esercizi',
			labelEdited: true,
			quickNotes: ['x'],
			quickNotesEdited: true
		};
		expect(categoryLabel(edited, tIt)).toBe('Esercizi');
		expect(quickNotesFor(edited, tIt)).toEqual(['x']);
	});
});
