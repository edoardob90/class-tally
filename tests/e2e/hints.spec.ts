import { expect, test, type Page } from '@playwright/test';
import { importRoster, log, smallRoster } from './helpers';

const nav = (page: Page, name: RegExp) => page.getByRole('navigation').getByRole('link', { name });
const toggle = (page: Page) => page.getByRole('button', { name: 'Show help hints' });

test.describe('help hints', () => {
	test('the "?" toggle shows captions on a phone, hides them again, and is remembered', async ({
		page
	}) => {
		await importRoster(page, smallRoster);
		await log(page, 'Greta A.', 'Behaviour');
		const gridHint = page.getByText('Tap a student to log a warning.', { exact: false });
		await expect(gridHint).toHaveCount(0);
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');

		await toggle(page).click();
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
		await expect(gridHint).toBeVisible();
		await expect(page.getByText('Change class', { exact: true })).toBeVisible();

		// Captions under icon buttons on touch screens.
		await nav(page, /History/).click();
		await page.getByLabel('Student').selectOption({ label: 'Greta A.' });
		await expect(page.getByText('Void', { exact: true })).toBeVisible();

		// Remembered on this device across a reload.
		await page.reload();
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');

		await toggle(page).click();
		await expect(page.getByText('Pencil: add or edit the note.', { exact: false })).toHaveCount(0);
		await page.reload();
		await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
	});
});
