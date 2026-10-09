import type { Locale } from '../domain';
import type { en, Messages } from './en';

export interface PluralForms {
	readonly one: string;
	readonly other: string;
}
export type Leaf = string | PluralForms;

type En = typeof en;

/** Dotted paths of every leaf (string or plural pair) of a message tree. */
type Paths<T, Prefix extends string = ''> = {
	[K in keyof T & string]: T[K] extends string | PluralForms
		? `${Prefix}${K}`
		: Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

type LeafAt<T, K extends string> = K extends `${infer Head}.${infer Rest}`
	? Head extends keyof T
		? LeafAt<T[Head], Rest>
		: never
	: K extends keyof T
		? T[K]
		: never;

/** Names of the {placeholders} in a string type. */
type Placeholders<S extends string> = S extends `${string}{${infer P}}${infer Rest}`
	? P | Placeholders<Rest>
	: never;

type ParamNames<L> = L extends string
	? Placeholders<L>
	: L extends PluralForms
		? Placeholders<L['one'] | L['other']> | 'count'
		: never;

export type Key = Paths<En>;
export type Params<K extends Key> = [ParamNames<LeafAt<En, K>>] extends [never]
	? []
	: [params: Record<ParamNames<LeafAt<En, K>>, string | number>];

/** Typed translation function: only valid keys, parameters required exactly when needed. */
export type TFn = <K extends Key>(key: K, ...params: Params<K>) => string;

/** Untyped view of `t()` for keys built at run time (e.g. from validation issue codes). */
export type LooseTFn = (key: string, params?: Record<string, string | number>) => string;

export type Dictionaries = Record<Locale, Messages>;

const PLACEHOLDER = /\{(\w+)\}/g;

/** The set of {placeholder} names used by a string. */
export function placeholdersOf(text: string): string[] {
	return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort();
}

export function isPlural(v: unknown): v is PluralForms {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as PluralForms).one === 'string' &&
		typeof (v as PluralForms).other === 'string'
	);
}

/** Every leaf of a message tree, by dotted key. */
export function flattenMessages(tree: unknown, prefix = ''): Map<string, Leaf> {
	const out = new Map<string, Leaf>();
	if (typeof tree !== 'object' || tree === null) return out;
	for (const [k, v] of Object.entries(tree)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (typeof v === 'string' || isPlural(v)) out.set(key, v);
		else for (const [ck, cv] of flattenMessages(v, key)) out.set(ck, cv);
	}
	return out;
}

function interpolate(text: string, params: Record<string, string | number> | undefined): string {
	if (!params) return text;
	return text.replace(PLACEHOLDER, (whole, name: string) =>
		name in params ? String(params[name]) : whole
	);
}

export interface TranslatorOptions {
	/** Called when a key is missing from the active locale or from English. */
	onMissing?: (key: string, locale: Locale) => void;
}

/** Pure translator for one locale; falls back to English, then to the key itself. */
export function createTranslator(
	dictionaries: Dictionaries,
	locale: Locale,
	options: TranslatorOptions = {}
): TFn {
	const flat = {
		en: flattenMessages(dictionaries.en),
		it: flattenMessages(dictionaries.it)
	} satisfies Record<Locale, Map<string, Leaf>>;
	const plural = new Intl.PluralRules(locale);

	const translate = (key: string, params?: Record<string, string | number>): string => {
		let leaf = flat[locale].get(key);
		if (leaf === undefined) {
			options.onMissing?.(key, locale);
			leaf = flat.en.get(key);
		}
		if (leaf === undefined) return key;
		if (typeof leaf === 'string') return interpolate(leaf, params);
		const count = Number(params?.count);
		const category = plural.select(Number.isFinite(count) ? count : 0);
		const form = category === 'one' ? leaf.one : leaf.other;
		return interpolate(form, params);
	};
	return translate as unknown as TFn;
}
