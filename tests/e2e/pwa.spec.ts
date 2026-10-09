import { expect, test, type Page } from '@playwright/test';
import { badge, importRoster, log, smallRoster } from './helpers';

/** Waits until the service worker is active and controls the page. */
async function controlled(page: Page): Promise<void> {
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

test.describe('installable app', () => {
	test('serves a manifest that works under the current base path', async ({
		page,
		request,
		baseURL
	}) => {
		await page.goto('./');
		const href = await page.locator('link[rel="manifest"]').getAttribute('href');
		const manifestUrl = new URL(href!, page.url()).toString();
		expect(manifestUrl).toBe(new URL('manifest.webmanifest', baseURL).toString());
		const response = await request.get(manifestUrl);
		expect(response.ok()).toBe(true);
		const manifest = await response.json();
		expect(manifest).toMatchObject({ display: 'standalone', start_url: './', scope: './' });
		// start_url resolves to the app's own root, whatever the base path is.
		expect(new URL(manifest.start_url, manifestUrl).toString()).toBe(
			new URL('./', baseURL).toString()
		);
		for (const icon of manifest.icons) {
			const res = await request.get(new URL(icon.src, manifestUrl).toString());
			expect(res.ok(), icon.src).toBe(true);
			expect(res.headers()['content-type']).toContain('image/png');
		}
		const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
		expect((await request.get(new URL(touch!, page.url()).toString())).ok()).toBe(true);
		await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
			'content',
			'yes'
		);
		await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
			'content',
			/viewport-fit=cover/
		);
	});

	test('registers a worker scoped to the app and caches only its own files', async ({
		page,
		baseURL
	}) => {
		await page.goto('./');
		await controlled(page);
		const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
		expect(scope).toBe(new URL('./', baseURL).toString());
		const cached = await page.evaluate(async () => {
			const names = await caches.keys();
			const urls: string[] = [];
			for (const name of names) {
				for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
			}
			return { names, urls };
		});
		expect(cached.names).toHaveLength(1);
		expect(cached.names[0]).toMatch(/^class-tally-/);
		const origin = new URL(baseURL!).origin;
		const root = new URL('./', baseURL).toString();
		expect(cached.urls.length).toBeGreaterThan(10);
		for (const url of cached.urls) {
			expect(url.startsWith(origin), url).toBe(true);
			expect(url.startsWith(root), url).toBe(true);
		}
		for (const expected of [
			'',
			'transcribe/',
			'settings/',
			'manifest.webmanifest',
			'icons/icon-192.png'
		]) {
			expect(cached.urls, expected).toContain(new URL(expected, root).toString());
		}
		expect(cached.urls.some((u) => u.includes('/_app/immutable/'))).toBe(true);
	});
});

test.describe('offline', () => {
	test('keeps working without a network: reload, log, navigate, open pages directly', async ({
		page,
		context
	}) => {
		await importRoster(page, smallRoster);
		await log(page, 'Aurora A.', 'Behaviour');
		await controlled(page);

		await context.setOffline(true);
		await page.reload();
		await expect(badge(page, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 1,/);

		// Log while offline: storage is local.
		await log(page, 'Aurora A.', 'Behaviour');
		await expect(page.getByRole('status')).toContainText('Behaviour #2 – Register entry');
		await expect(badge(page, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 2,/);

		// Client-side navigation and direct document loads of other pages.
		await page
			.getByRole('navigation')
			.getByRole('link', { name: /To transcribe/ })
			.click();
		await expect(page.getByRole('heading', { name: 'To transcribe' })).toBeVisible();
		await page.goto('settings/');
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
		await expect(page.getByText('Ready for offline use.')).toBeVisible();
		await page.goto('history/');
		await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
		await page.goto('./');
		await expect(badge(page, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 2,/);

		// And the data is there once the network is back.
		await context.setOffline(false);
		await page.reload();
		await expect(badge(page, 'Aurora A.', 'Behaviour')).toHaveAccessibleName(/Behaviour: 2,/);
	});
});
