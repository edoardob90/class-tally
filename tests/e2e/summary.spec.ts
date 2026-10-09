import { expect, test, type Page } from '@playwright/test';
import { badge, importRoster, log, smallRoster } from './helpers';

const nav = (page: Page, name: RegExp) => page.getByRole('navigation').getByRole('link', { name });

const items = (page: Page) => page.getByRole('main').getByRole('listitem');

async function logLadder(page: Page, student: string) {
	// verbal, register, register, note
	for (let i = 0; i < 4; i++) await log(page, student, 'Behaviour');
}

async function openStudentHistory(page: Page, student: string) {
	await nav(page, /History/).click();
	await page.getByLabel('Student').selectOption({ label: student });
}

test.describe('To transcribe', () => {
	test('lists register entries and notes, marks them one by one and all at once, with undo', async ({
		page
	}) => {
		await importRoster(page, smallRoster);
		await logLadder(page, 'Dario A.');
		await log(page, 'Greta A.', 'Homework'); // verbal only: not for the register
		await expect(page.getByRole('img', { name: '3 items to transcribe' })).toBeVisible();

		await nav(page, /To transcribe/).click();
		await expect(page.getByRole('heading', { name: 'To transcribe' })).toBeVisible();
		await expect(page.getByText('3 events to transcribe')).toBeVisible();
		await expect(page.getByRole('heading', { name: '1AX' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
		await expect(items(page)).toHaveCount(3);
		await expect(items(page).filter({ hasText: 'Disciplinary note' })).toHaveCount(1);

		await page.getByRole('button', { name: 'Mark transcribed: Dario A.' }).first().click();
		await expect(page.getByRole('status')).toContainText('1 event marked as transcribed');
		await expect(items(page)).toHaveCount(2);
		await page.getByRole('status').getByRole('button', { name: 'Undo' }).click();
		await expect(items(page)).toHaveCount(3);

		await page.getByRole('button', { name: 'Mark all transcribed' }).click();
		await expect(page.getByText('Nothing to transcribe. Well done!')).toBeVisible();
		await expect(page.getByRole('img', { name: /to transcribe/ })).toHaveCount(0);

		// Persisted.
		await page.reload();
		await expect(page.getByText('Nothing to transcribe. Well done!')).toBeVisible();
	});
});

test.describe('History and void', () => {
	test('voiding an event updates counts, snapshots and the check-register flag', async ({
		page
	}) => {
		await importRoster(page, smallRoster);
		await logLadder(page, 'Dario A.');
		await expect(badge(page, 'Dario A.', 'Behaviour')).toHaveAccessibleName(
			'Behaviour: 4, next: Disciplinary note'
		);

		// The disciplinary note (#4) is copied to the register.
		await nav(page, /To transcribe/).click();
		await items(page)
			.filter({ hasText: 'Disciplinary note' })
			.getByRole('button', { name: /Mark transcribed/ })
			.click();
		// The two register entries (#2, #3) are still to do.
		await expect(page.getByRole('img', { name: '2 items to transcribe' })).toBeVisible();

		await openStudentHistory(page, 'Dario A.');
		const rows = items(page).filter({ hasText: /No\. \d/ });
		await expect(rows).toHaveCount(4);
		await expect(rows.first()).toContainText('No. 4');
		await expect(rows.first()).toContainText('Transcribed');

		// Void #2: #3 drops to count 2 (still a register entry), #4 would become count 3.
		await rows.filter({ hasText: 'No. 2' }).getByRole('button', { name: 'Void event' }).click();
		const dialog = page.getByRole('dialog', { name: 'Void this event?' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Void', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Event voided. 2 later events updated');

		await expect(rows.filter({ hasText: 'Voided' })).toHaveCount(1);
		const four = rows.filter({ hasText: 'No. 4' });
		await expect(four).toContainText('Check register');
		await expect(four).toContainText('Disciplinary note'); // keeps its snapshot
		// #3 was recomputed: it is now the second counted event.
		await expect(rows.filter({ hasText: 'No. 2' }).filter({ hasNotText: 'Voided' })).toHaveCount(1);

		// Live counts on the grid ignore the voided event.
		await nav(page, /Class/).click();
		await expect(badge(page, 'Dario A.', 'Behaviour')).toHaveAccessibleName(
			'Behaviour: 3, next: Disciplinary note'
		);

		// Pending: the recomputed #3 plus the flagged #4.
		await expect(page.getByRole('img', { name: '2 items to transcribe' })).toBeVisible();
		await nav(page, /To transcribe/).click();
		await expect(page.getByRole('heading', { name: 'Check register' })).toBeVisible();
		await page.getByRole('button', { name: 'Checked' }).click();
		await expect(page.getByRole('heading', { name: 'Check register' })).toHaveCount(0);
		await expect(page.getByRole('img', { name: '1 item to transcribe' })).toBeVisible();

		// Everything survives a reload.
		await page.reload();
		await expect(page.getByRole('img', { name: '1 item to transcribe' })).toBeVisible();
	});

	test('warns when voiding an event that is already on the register', async ({ page }) => {
		await importRoster(page, smallRoster);
		await logLadder(page, 'Dario A.');
		await nav(page, /To transcribe/).click();
		await page.getByRole('button', { name: 'Mark all transcribed' }).click();
		await openStudentHistory(page, 'Dario A.');
		await items(page)
			.filter({ hasText: 'No. 3' })
			.getByRole('button', { name: 'Void event' })
			.click();
		await expect(page.getByText('It is already on the official register.')).toBeVisible();
		await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});

	test('shows a class in a date range and edits a note', async ({ page }) => {
		await importRoster(page, smallRoster);
		await log(page, 'Greta A.', 'Behaviour');
		await log(page, 'Aurora A.', 'Homework');
		await nav(page, /History/).click();
		await page.getByRole('button', { name: 'By class' }).click();
		await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
		await expect(items(page).filter({ hasText: /No\. 1/ })).toHaveCount(2);
		await expect(items(page).filter({ hasText: 'Greta A.' })).toHaveCount(1);

		// A category filter and an empty range.
		await page.getByLabel('Category').selectOption({ label: 'Homework' });
		await expect(items(page).filter({ hasText: /No\. 1/ })).toHaveCount(1);
		await page.getByLabel('Category').selectOption({ label: 'All categories' });
		await page.getByLabel('From', { exact: true }).fill('2020-01-01');
		await page.getByLabel('To', { exact: true }).fill('2020-01-31');
		await expect(page.getByText('No events in this period.')).toBeVisible();
		await page.getByRole('button', { name: 'Last 7 days' }).click();
		await expect(items(page).filter({ hasText: /No\. 1/ })).toHaveCount(2);

		// Edit a note.
		await items(page)
			.filter({ hasText: 'Greta A.' })
			.getByRole('button', { name: 'Edit note' })
			.click();
		const dialog = page.getByRole('dialog', { name: 'Note for Greta A.' });
		await dialog.getByRole('textbox').fill('Forgot the book');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(items(page).filter({ hasText: 'Forgot the book' })).toHaveCount(1);
	});

	test('keeps its filters when switching tabs', async ({ page }) => {
		await importRoster(page, smallRoster);
		await log(page, 'Greta A.', 'Behaviour');
		await log(page, 'Greta A.', 'Homework');
		await openStudentHistory(page, 'Greta A.');
		await page.getByLabel('Category').selectOption({ label: 'Homework' });
		await expect(page.getByRole('heading', { name: 'Behaviour' })).toHaveCount(0);

		await nav(page, /Class/).click();
		await expect(page.getByRole('button', { name: /^Greta A\./ })).toBeVisible();
		await nav(page, /History/).click();
		await expect(page.getByLabel('Student')).toHaveValue(/.+/);
		await expect(page.getByLabel('Category')).toHaveValue('homework');
		await expect(page.getByRole('heading', { name: 'Homework' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Behaviour' })).toHaveCount(0);

		await page.getByRole('button', { name: 'By class' }).click();
		await nav(page, /To transcribe/).click();
		await nav(page, /History/).click();
		await expect(page.getByRole('button', { name: 'By class' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});
});
