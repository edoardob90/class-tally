import { LOCALES, dayKey, addDaysToKey, startOfDay, type Locale } from '../domain';
import { en } from './en';
import { it } from './it';
import { createTranslator, type Dictionaries, type Key, type TFn } from './translate';

const dictionaries: Dictionaries = { en, it };

const translators: Record<Locale, TFn> = {
	en: createTranslator(dictionaries, 'en'),
	it: createTranslator(dictionaries, 'it', {
		onMissing: (key) => {
			if (import.meta.env.DEV) console.warn(`[i18n] missing Italian string: ${key}`);
		}
	})
};

let current = $state<Locale>('en');

/** Reactive current locale. Reading `locale.current` inside a template or `$derived` tracks it. */
export const locale = {
	get current(): Locale {
		return current;
	},
	set(next: Locale): void {
		if (!LOCALES.includes(next)) return;
		current = next;
		if (typeof document !== 'undefined') document.documentElement.lang = next;
	}
};

/** Translates with the active locale; re-evaluates when the locale changes. */
export const t: TFn = ((key: Key, ...params: unknown[]) =>
	(translators[current] as (key: Key, ...params: unknown[]) => string)(key, ...params)) as TFn;

const formatters = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat>(
	kind: 'd' | 'n',
	options: object | undefined,
	make: (l: Locale) => T
): T {
	const key = `${kind}:${current}:${JSON.stringify(options ?? {})}`;
	let f = formatters.get(key);
	if (!f) {
		f = make(current);
		formatters.set(key, f);
	}
	return f as T;
}

/** Date and time formatting in the device time zone with the active locale. */
export function formatDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions) {
	const opts = options ?? { weekday: 'short', day: 'numeric', month: 'short' };
	return cached('d', opts, (l) => new Intl.DateTimeFormat(l, opts)).format(new Date(value));
}

export function formatTime(value: Date | number | string) {
	const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
	return cached('d', opts, (l) => new Intl.DateTimeFormat(l, opts)).format(new Date(value));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
	return cached('n', options, (l) => new Intl.NumberFormat(l, options)).format(value);
}

/** Collator for sorting names in the active locale. */
export function nameCollator(): Intl.Collator {
	return new Intl.Collator(current, { numeric: true, sensitivity: 'base' });
}

/** Heading for a local day (`YYYY-MM-DD`): "Today", "Yesterday" or a short date. */
export function dayHeading(key: string, now: number = Date.now()): string {
	const today = dayKey(now);
	if (key === today) return t('transcribe.today');
	if (key === addDaysToKey(today, -1)) return t('transcribe.yesterday');
	return formatDate(startOfDay(key), { weekday: 'long', day: 'numeric', month: 'long' });
}
