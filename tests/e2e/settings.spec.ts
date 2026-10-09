import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { badge, importRoster, log, smallRoster } from './helpers';

const DAY = 24 * 60 * 60 * 1000;

const nav = (page: Page, name: RegExp) => page.getByRole('navigation').getByRole('link', { name });

async function openCategory(page: Page, name: string) {
	await nav(page, /Settings/).click();
	const details = page.locator('details').filter({ hasText: name }).first();
	// Sections stay open across tabs, so only open a closed one.
	if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
		await details.locator('summary').click();
	}
	return details;
}

async function download(page: Page, button: string): Promise<string> {
	const [file] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: button }).click()
	]);
	return readFileSync((await file.path())!, 'utf8');
}

test.describe('category settings', () => {
	test('a shorter window changes the live counts', async ({ page }) => {
		await page.clock.install({ time: new Date('2026-10-05T09:00:00+02:00') });
		await importRoster(page, smallRoster);
		await log(page, 'Greta A.', 'Behaviour');
		await expect(badge(page, 'Greta A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 1,/);

		const details = await openCategory(page, 'Behaviour');
		await details.getByLabel('Rolling window (days)').fill('1');
		await details.getByRole('button', { name: 'Save category' }).click();
		await expect(page.getByRole('status')).toContainText('Saved');

		await nav(page, /Class/).click();
		await expect(badge(page, 'Greta A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 1,/);
		await page.clock.fastForward(2 * DAY);
		await expect(badge(page, 'Greta A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 0,/);
	});

	test('keeps open sections when switching tabs', async ({ page }) => {
		await importRoster(page, smallRoster);
		const details = await openCategory(page, 'Homework');
		await expect(details.getByLabel('Rolling window (days)')).toBeVisible();
		await nav(page, /Class/).click();
		await nav(page, /Settings/).click();
		const again = page.locator('details').filter({ hasText: 'Homework' }).first();
		await expect(again.getByLabel('Rolling window (days)')).toBeVisible();
		await expect(
			page
				.locator('details')
				.filter({ hasText: 'Behaviour' })
				.first()
				.getByLabel('Rolling window (days)')
		).toBeHidden();
	});

	test('shows clear messages for an invalid window and an invalid ladder', async ({ page }) => {
		await importRoster(page, smallRoster);
		const details = await openCategory(page, 'Homework');
		await details.getByLabel('Rolling window (days)').fill('366');
		await details.getByRole('button', { name: 'Save category' }).click();
		await expect(details.getByText('The window must be between 1 and 365 days.')).toBeVisible();

		await details.getByLabel('Rolling window (days)').fill('30');
		const from = details.getByLabel('From event no.');
		await from.first().fill('2');
		await details.getByRole('button', { name: 'Save category' }).click();
		await expect(details.getByText('The first step must start at 1.')).toBeVisible();

		await from.first().fill('1');
		await from.nth(1).fill('1');
		await details.getByRole('button', { name: 'Save category' }).click();
		await expect(details.getByText('Steps must increase: this one must be above 1.')).toBeVisible();

		await from.nth(1).fill('3');
		await details.getByRole('button', { name: 'Save category' }).click();
		await expect(page.getByRole('status')).toContainText('Saved');
		await expect(details.getByRole('alert')).toHaveCount(0);
	});

	test('a new ladder applies to new events, and reset restores the defaults', async ({ page }) => {
		await importRoster(page, smallRoster);
		const details = await openCategory(page, 'Materials');
		// Ladder: 1 register entry, 2 disciplinary note.
		await details.getByLabel('Action').first().selectOption('register');
		await details.getByLabel('Action').nth(1).selectOption('note');
		await details.getByLabel('From event no.').nth(1).fill('2');
		await details.getByRole('button', { name: 'Remove step' }).last().click();
		await details.getByRole('button', { name: 'Save category' }).click();
		await expect(page.getByRole('status')).toContainText('Saved');

		await nav(page, /Class/).click();
		await log(page, 'Greta A.', 'Materials');
		await expect(page.getByRole('status')).toContainText('Materials #1 – Register entry');
		await log(page, 'Greta A.', 'Materials');
		await expect(page.getByRole('status')).toContainText('Materials #2 – Disciplinary note');

		await openCategory(page, 'Materials');
		await page.getByRole('button', { name: 'Reset to defaults' }).first().click();
		await page.getByRole('dialog').getByRole('button', { name: 'Reset', exact: true }).click();
		await nav(page, /Class/).click();
		await log(page, 'Dario A.', 'Materials');
		await expect(page.getByRole('status')).toContainText('Materials #1 – Verbal warning');
	});

	test('edited labels are kept; unedited ones follow the language', async ({ page }) => {
		await importRoster(page, smallRoster);
		const details = await openCategory(page, 'Homework');
		await details.getByLabel('Label').fill('Exercises');
		await details.getByRole('button', { name: 'Save category' }).click();
		await expect(page.getByRole('status')).toContainText('Saved');
		await page.getByRole('button', { name: 'Italiano' }).click();
		await expect(page.locator('details').filter({ hasText: 'Exercises' })).toHaveCount(1);
		await expect(page.locator('details').filter({ hasText: 'Comportamento' })).toHaveCount(1);
	});
});

test.describe('backups and data', () => {
	test('exports a JSON backup and CSV, and imports the backup into an empty app', async ({
		page,
		browser,
		baseURL
	}) => {
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await log(page, 'Aurora A.', 'Behaviour');
		await nav(page, /Settings/).click();
		await expect(page.getByText('No export yet.')).toBeVisible();

		const json = await download(page, 'Export backup (JSON)');
		const backup = JSON.parse(json);
		expect(backup.format).toBe('class-tally-backup');
		expect(backup.data.events).toHaveLength(2);
		expect(backup.data.students).toHaveLength(3);
		expect(
			backup.data.students.find((s: { label: string }) => s.label === 'Aurora A.')
		).toMatchObject({ name: 'Aurora', surname: 'Agata' });
		await expect(page.getByText(/^Last export:/)).toBeVisible();

		const csv = await download(page, 'Export events (CSV)');
		const lines = csv.replace('﻿', '').trim().split('\r\n');
		expect(lines[0]).toBe(
			'id,class,student,category,count,action,note,createdAt,updatedAt,transcribedAt,voidedAt,localDate,localTime'
		);
		expect(lines).toHaveLength(3);
		expect(lines[2]).toContain(',1AX,Aurora A.,behaviour,2,register,');

		// A second device: import the backup.
		const context = await browser.newContext({ baseURL, serviceWorkers: 'block' });
		const other = await context.newPage();
		await other.goto('settings/');
		await other.getByTestId('backup-file').setInputFiles({
			name: 'backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(json)
		});
		await expect(other.getByText(/1 class, 3 students, 2 events/)).toBeVisible();
		await other.getByRole('button', { name: 'Merge', exact: true }).click();
		await expect(other.getByRole('status')).toContainText('Imported. New: 6');
		await other.goto('./');
		await expect(badge(other, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 2,/);
		await context.close();
	});

	test('replace drops what is not in the backup; a bad file is refused', async ({
		page,
		browser,
		baseURL
	}) => {
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await nav(page, /Settings/).click();
		const json = await download(page, 'Export backup (JSON)');

		const context = await browser.newContext({ baseURL, serviceWorkers: 'block' });
		const other = await context.newPage();
		await importRoster(
			other,
			JSON.stringify({ class: '2BX', students: [{ name: 'Zinnia Quirino' }] }),
			'Quirino Z.'
		);
		await other.goto('settings/');
		const file = other.getByTestId('backup-file');
		await file.setInputFiles({
			name: 'x.json',
			mimeType: 'application/json',
			buffer: Buffer.from('nope')
		});
		await expect(other.getByText('This file is not valid JSON.')).toBeVisible();
		await file.setInputFiles({
			name: 'x.json',
			mimeType: 'application/json',
			buffer: Buffer.from('{"format":"other"}')
		});
		await expect(other.getByText('This is not a class-tally backup.')).toBeVisible();

		await file.setInputFiles({
			name: 'backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(json)
		});
		await other.getByLabel('Replace current data').check();
		await expect(other.getByText(/removed: 2/)).toBeVisible();
		await other.getByRole('button', { name: 'Replace', exact: true }).click();
		await expect(other.getByRole('status')).toContainText('Imported');
		await other.goto('./');
		await expect(other.getByRole('button', { name: '1AX' })).toBeVisible();
		await expect(other.getByRole('button', { name: /Quirino/ })).toHaveCount(0);
		await context.close();
	});

	test('reminds about a backup when the last export is too old, and stops after an export', async ({
		page
	}) => {
		await page.clock.install({ time: new Date('2026-10-05T09:00:00+02:00') });
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await expect(page.getByText('You have not exported a backup yet.')).toHaveCount(0);
		await page.clock.fastForward(8 * DAY); // 8 days
		await expect(page.getByText('You have not exported a backup yet.')).toBeVisible();
		await page.getByRole('link', { name: 'Back up now' }).click();
		await download(page, 'Export backup (JSON)');
		await nav(page, /Class/).click();
		await expect(page.getByText('You have not exported a backup yet.')).toHaveCount(0);
		await page.clock.fastForward(8 * DAY);
		await expect(page.getByText(/Your last backup is 8 days old\./)).toBeVisible();
	});

	test('can turn the reminder off', async ({ page }) => {
		await page.clock.install({ time: new Date('2026-10-05T09:00:00+02:00') });
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await nav(page, /Settings/).click();
		await page.getByLabel('Remind me to back up every (days)').fill('0');
		await page.getByLabel('Remind me to back up every (days)').blur();
		await page.getByLabel('Remind me to back up every (days)').fill('400');
		await page.getByLabel('Remind me to back up every (days)').blur();
		await expect(page.getByText('Enter a number of days from 0 to 365.')).toBeVisible();
		await page.getByLabel('Remind me to back up every (days)').fill('0');
		await page.getByLabel('Remind me to back up every (days)').blur();
		await nav(page, /Class/).click();
		await page.clock.fastForward(20 * DAY);
		await expect(page.getByText('You have not exported a backup yet.')).toHaveCount(0);
	});

	test('deletes everything only after the typed word', async ({ page }) => {
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await nav(page, /Settings/).click();
		const wipe = page.getByRole('button', { name: 'Delete everything' });
		await expect(wipe).toBeDisabled();
		await page.getByLabel('Type DELETE to confirm').fill('delet');
		await expect(wipe).toBeDisabled();
		await page.getByLabel('Type DELETE to confirm').fill('delete');
		await expect(wipe).toBeEnabled();
		await wipe.click();
		await expect(page.getByRole('status')).toContainText('All data deleted.');
		await nav(page, /Class/).click();
		await expect(page.getByRole('heading', { name: 'No classes yet' })).toBeVisible();
		await page.reload();
		await expect(page.getByRole('heading', { name: 'No classes yet' })).toBeVisible();
	});

	test('shows the storage protection status', async ({ page }) => {
		await page.goto('settings/');
		await expect(page.getByRole('heading', { name: 'Storage' })).toBeVisible();
		await expect(page.getByText(/Protected:|Not protected:|cannot tell/)).toBeVisible();
	});

	test('the Italian delete word is ELIMINA', async ({ page }) => {
		await page.goto('settings/');
		await page.getByRole('button', { name: 'Italiano' }).click();
		await expect(page.getByLabel('Scrivi ELIMINA per confermare')).toBeVisible();
	});
});
