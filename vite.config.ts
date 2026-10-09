import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

// Unit tests run in a fixed zone so daylight saving tests are deterministic.
process.env.TZ ??= 'Europe/Rome';

// BASE_PATH is '' (domain root) or '/something' (GitHub Pages sub-path).
const rawBase = (process.env.BASE_PATH ?? '').trim().replace(/\/+$/, '');
const base = rawBase === '' || rawBase.startsWith('/') ? rawBase : `/${rawBase}`;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: '404.html',
				precompress: false,
				strict: true
			}),
			paths: { base: base as '' | `/${string}` },
			// Registered by hand in src/lib/pwa.ts so the update state can be observed.
			serviceWorker: { register: false }
		})
	],
	test: {
		include: ['tests/unit/**/*.test.ts'],
		environment: 'node',
		passWithNoTests: true
	}
});
