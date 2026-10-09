import { afterEach, describe, expect, it } from 'vitest';
import { formatDate, formatNumber, locale, t } from '../../src/lib/i18n';

afterEach(() => locale.set('en'));

describe('locale store', () => {
	it('starts in English and switches without reload', () => {
		expect(locale.current).toBe('en');
		expect(t('nav.settings')).toBe('Settings');
		locale.set('it');
		expect(locale.current).toBe('it');
		expect(t('nav.settings')).toBe('Impostazioni');
		locale.set('en');
		expect(t('nav.settings')).toBe('Settings');
	});

	it('ignores unknown locales', () => {
		locale.set('fr' as 'en');
		expect(locale.current).toBe('en');
	});

	it('formats dates and numbers with the active locale', () => {
		const d = new Date(2026, 9, 9, 10, 0);
		expect(formatDate(d, { month: 'long' })).toBe('October');
		expect(formatNumber(12345.5)).toBe('12,345.5');
		locale.set('it');
		expect(formatDate(d, { month: 'long' })).toBe('ottobre');
		expect(formatNumber(12345.5)).toBe('12.345,5');
	});
});
