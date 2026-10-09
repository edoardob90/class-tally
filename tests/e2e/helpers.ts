import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';

export const rosterText = readFileSync('fixtures/example-roster.json', 'utf8');

/** A small roster with names that are easy to find. */
export const smallRoster = JSON.stringify({
	class: '1AX',
	students: [
		{ id: '1', name: 'Agata Aurora', weight: 1 },
		{ id: '2', name: 'Alabastro Dario', weight: 1 },
		{ id: '3', name: 'Ambra Greta', weight: 1 }
	]
});

/** Imports a roster through the UI and lands on the class grid. */
export async function importRoster(
	page: Page,
	text: string = rosterText,
	firstLabel = 'Aurora A.'
): Promise<void> {
	await page.goto('./');
	await page.getByRole('link', { name: 'Import roster' }).first().click();
	await page.getByLabel('Roster text').fill(text);
	await page.getByRole('button', { name: 'Preview' }).click();
	await page.getByRole('button', { name: /^Import \d+ students?$/ }).click();
	await expect(student(page, firstLabel)).toBeVisible();
}

export const student = (page: Page, label: string): Locator =>
	page.getByRole('button', { name: new RegExp(`^${label.replace('.', '\\.')}`) });

/** Opens the category sheet of a student and taps a category. */
export async function log(page: Page, label: string, category: string): Promise<void> {
	await student(page, label).click();
	await page.getByRole('button', { name: new RegExp(`^${category} – next`) }).click();
}

export const badge = (page: Page, label: string, category: string): Locator =>
	student(page, label).getByRole('img', { name: new RegExp(`^${category}: `) });
