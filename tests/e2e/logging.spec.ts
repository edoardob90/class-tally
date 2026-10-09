import { expect, test } from '@playwright/test';
import { badge, importRoster, log, rosterText, smallRoster, student } from './helpers';

test.describe('roster import and logging', () => {
	test('imports the example roster and shows the first class', async ({ page }) => {
		await page.goto('./');
		await expect(page.getByRole('heading', { name: 'No classes yet' })).toBeVisible();
		await page.getByRole('link', { name: 'Import roster' }).first().click();
		await page.getByLabel('Roster text').fill(rosterText);
		await page.getByRole('button', { name: 'Preview' }).click();
		await expect(page.getByRole('button', { name: 'Import 60 students' })).toBeVisible();
		await page.getByRole('button', { name: 'Import 60 students' }).click();
		await expect(page.getByRole('button', { name: /^Aurora A\./ })).toBeVisible();
		await expect(page.getByRole('button', { name: '1AX' })).toBeVisible();
		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(21);
	});

	test('switches class and remembers it after a reload', async ({ page }) => {
		await importRoster(page);
		await page.getByRole('button', { name: 'Switch class' }).click();
		await page.getByRole('button', { name: /^2BX/ }).click();
		await expect(page.getByRole('button', { name: '2BX' })).toBeVisible();
		await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(19);
		await page.reload();
		await expect(page.getByRole('button', { name: '2BX' })).toBeVisible();
	});

	test('logs in all categories and updates badges, hints and the navigation badge', async ({
		page
	}) => {
		await importRoster(page, smallRoster);
		await student(page, 'Aurora A.').click();
		// The sheet shows what each category would trigger.
		await expect(
			page.getByRole('button', { name: 'Behaviour – next: Verbal warning' })
		).toBeVisible();
		await page.getByRole('button', { name: 'Behaviour – next: Verbal warning' }).click();
		await expect(page.getByRole('status')).toContainText(
			'Aurora A. – Behaviour #1 – Verbal warning'
		);
		await expect(badge(page, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(
			'Behaviour: 1, next: Register entry'
		);

		await log(page, 'Aurora A.', 'Behaviour');
		await expect(page.getByRole('status')).toContainText('Behaviour #2 – Register entry');
		await expect(badge(page, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(
			'Behaviour: 2, next: Register entry'
		);
		await expect(page.getByRole('img', { name: '1 item to transcribe' })).toBeVisible();

		await log(page, 'Aurora A.', 'Homework');
		await log(page, 'Aurora A.', 'Materials');
		await expect(badge(page, 'Aurora A.', 'Homework')).toHaveAccessibleName(
			'Homework: 1, next: Register entry'
		);
		await expect(badge(page, 'Aurora A.', 'Materials')).toHaveAccessibleName(
			'Materials: 1, next: Register entry'
		);
		// Other students are untouched.
		await expect(badge(page, 'Dario A.', 'Behaviour')).toHaveAccessibleName(
			'Behaviour: 0, next: Verbal warning'
		);
	});

	test('follows the behaviour ladder up to the disciplinary note', async ({ page }) => {
		await importRoster(page, smallRoster);
		for (let i = 0; i < 4; i++) await log(page, 'Dario A.', 'Behaviour');
		await expect(page.getByRole('status')).toContainText('Behaviour #4 – Disciplinary note');
		await expect(badge(page, 'Dario A.', 'Behaviour')).toHaveAccessibleName(
			'Behaviour: 4, next: Disciplinary note'
		);
		// Three entries are for the register: #2, #3 and #4.
		await expect(page.getByRole('img', { name: '3 items to transcribe' })).toBeVisible();
	});

	test('undo removes the event again', async ({ page }) => {
		await importRoster(page, smallRoster);
		await log(page, 'Greta A.', 'Behaviour');
		await expect(badge(page, 'Greta A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 1,/);
		await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
		await expect(page.getByRole('status')).toHaveCount(0);
		await expect(badge(page, 'Greta A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 0,/);
	});

	test('adds a note with a quick phrase', async ({ page }) => {
		await importRoster(page, smallRoster);
		await log(page, 'Greta A.', 'Behaviour');
		await page.getByRole('status').getByRole('button', { name: 'Add note' }).click();
		const dialog = page.getByRole('dialog', { name: 'Note for Greta A.' });
		await dialog.getByRole('button', { name: 'Phone' }).click();
		await dialog.getByRole('textbox').fill('Phone, second time');
		await expect(dialog.getByText('18 / 200')).toBeVisible();
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('status')).toContainText('Note saved');
	});

	test('the toast goes away by itself after about 8 seconds', async ({ page }) => {
		await page.clock.install();
		await importRoster(page, smallRoster);
		await log(page, 'Greta A.', 'Behaviour');
		await expect(page.getByRole('status')).toBeVisible();
		await page.clock.runFor(7_000);
		await expect(page.getByRole('status')).toBeVisible();
		await page.clock.runFor(2_000);
		await expect(page.getByRole('status')).toHaveCount(0);
	});

	test('keeps everything after a reload', async ({ page }) => {
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await log(page, 'Aurora A.', 'Behaviour');
		await log(page, 'Dario A.', 'Homework');
		await page.reload();
		await expect(badge(page, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 2,/);
		await expect(badge(page, 'Dario A.', 'Homework')).toHaveAccessibleName(/Homework: 1,/);
		await expect(page.getByRole('img', { name: '1 item to transcribe' })).toBeVisible();
	});

	test('makes no request outside its own origin', async ({ page, baseURL }) => {
		const foreign: string[] = [];
		page.on('request', (request) => {
			const url = request.url();
			if (
				!url.startsWith(new URL(baseURL!).origin) &&
				!url.startsWith('data:') &&
				!url.startsWith('blob:')
			) {
				foreign.push(url);
			}
		});
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await page.goto('settings/');
		await page.goto('./');
		expect(foreign).toEqual([]);
	});
});
