import { expect, test } from '@playwright/test';
import { importRoster, log, smallRoster } from './helpers';

// A raw message key (for example "nav.history") on screen means a string is missing.
const KEY_SHAPED = /\b[a-z][a-zA-Z]+(\.[a-zA-Z]+)+\b/;

test('switches to Italian without reload and every screen is translated', async ({ page }) => {
	await importRoster(page, smallRoster);
	await log(page, 'Aurora A.', 'Behaviour');
	await log(page, 'Aurora A.', 'Behaviour');

	await page.goto('settings/');
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
	// A reload would reset the navigation entry; this flag proves there is none.
	await page.evaluate(() => ((window as unknown as { __kept: boolean }).__kept = true));
	await page.getByRole('button', { name: 'Italiano' }).click();
	await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible();
	expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(true);
	await expect(page.locator('html')).toHaveAttribute('lang', 'it');

	const nav = page.getByRole('navigation', { name: 'Navigazione principale' });
	await expect(nav.getByRole('link', { name: /Classe/ })).toBeVisible();
	await expect(nav.getByRole('link', { name: /Da trascrivere/ })).toBeVisible();
	await expect(nav.getByRole('link', { name: /Storico/ })).toBeVisible();

	const screens: Array<{ path: string; expects: RegExp }> = [
		{ path: './', expects: /Cambia classe/ },
		{ path: 'transcribe/', expects: /Da trascrivere/ },
		{ path: 'history/', expects: /Storico/ },
		{ path: 'classes/', expects: /Classi/ },
		{ path: 'import/', expects: /Importa elenco/ },
		{ path: 'settings/', expects: /Lingua/ }
	];
	for (const screen of screens) {
		await page.goto(screen.path);
		await expect(page.getByRole('main')).toContainText(screen.expects);
		const text = await page.locator('body').innerText();
		expect(text, screen.path).not.toMatch(KEY_SHAPED);
	}

	// The Italian logging flow: glossary terms in the sheet and the toast.
	await page.goto('./');
	await page.getByRole('button', { name: /^Aurora A\./ }).click();
	await expect(
		page.getByRole('button', { name: 'Comportamento – prossimo: Richiamo sul registro' })
	).toBeVisible();
	await page.getByRole('button', { name: /^Compiti – prossimo/ }).click();
	await expect(page.getByRole('status')).toContainText('Aurora A. – Compiti n. 1 – Avviso verbale');

	// The choice survives a reload.
	await page.reload();
	await expect(page.getByRole('button', { name: /Comportamento: 2/ }).first()).toBeVisible();
});
