// App shell for offline use: precache everything the build produced, then serve from the cache.
// Nothing is ever fetched from another origin, and nothing but the app's own files is cached.
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { asset, resolve } from '$app/paths';
import { self } from '$app/service-worker';

const PREFIX = 'class-tally-';
const CACHE = `${PREFIX}${version}`;

// The manifest paths are relative to the base path (which is empty or `/something`).
const root = resolve('/');
const at = (path: string) => root + path.replace(/^\//, '');

/** Every file of the app: build output, static files and prerendered pages. */
const urls = [
	...new Set([
		...immutable.map((e) => at(e.path)),
		...assets.map((e) => asset(e.path)),
		...prerendered.map((e) => at(e.path))
	])
];

const shell = at('');

self.addEventListener('install', (event) => {
	// A new worker waits until the page asks for it (see src/lib/state/pwa.svelte.ts), so a
	// running page never has its files replaced underneath it.
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(urls)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
			}
			await self.clients.claim();
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

async function respond(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	// `ignoreVary`: hosts that send `Vary: Origin` would otherwise never match module script
	// requests, which carry an Origin header that the precache request did not have.
	const hit = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
	if (hit) return hit;
	if (request.mode === 'navigate') {
		// Any other page of the app is the same shell: the router takes over on the client.
		const fallback = await cache.match(shell);
		if (fallback) return fallback;
	}
	return fetch(request);
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	if (new URL(request.url).origin !== self.location.origin) return;
	event.respondWith(respond(request));
});
