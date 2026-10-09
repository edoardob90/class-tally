import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const base = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
// Cloud sandboxes ship their own Chromium; point at it with PW_CHROMIUM_PATH.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

const iphone = {
	...devices['iPhone 14'],
	timezoneId: 'Europe/Rome',
	locale: 'en-US',
	serviceWorkers: 'allow' as const
};

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
	use: {
		baseURL: `http://localhost:${port}${base}/`,
		trace: 'retain-on-failure'
	},
	projects: [
		{
			name: 'iphone-chromium',
			use: {
				...iphone,
				defaultBrowserType: 'chromium',
				launchOptions: { executablePath }
			}
		},
		// WebKit is not available in every sandbox; CI installs it and runs this project too.
		...(process.env.E2E_WEBKIT
			? [
					{
						name: 'iphone-webkit',
						use: { ...devices['iPhone 14'], timezoneId: 'Europe/Rome', locale: 'en-US' }
					}
				]
			: [])
	],
	webServer: {
		command: `npm run build && npm run preview -- --port ${port} --strictPort`,
		url: `http://localhost:${port}${base}/`,
		reuseExistingServer: !!process.env.E2E_REUSE,
		timeout: 240_000
	}
});
