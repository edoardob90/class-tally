import { resolve } from '$app/paths';

/** Service worker state for the Settings screen and the navigation dot. */
class PwaState {
	/** The worker controls this page: the app works offline. */
	offlineReady = $state(false);
	/** A newer version has been downloaded and waits for a reload. */
	updateReady = $state(false);
	supported = $state(false);

	private registration: ServiceWorkerRegistration | undefined;
	private reloading = false;

	async register(): Promise<void> {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
		if (import.meta.env.DEV) return;
		this.supported = true;
		try {
			const registration = await navigator.serviceWorker.register(
				`${resolve('/')}service-worker.js`
			);
			this.registration = registration;
			this.offlineReady = !!navigator.serviceWorker.controller;
			navigator.serviceWorker.ready.then(() => (this.offlineReady = true));

			if (registration.waiting && navigator.serviceWorker.controller) this.updateReady = true;
			registration.addEventListener('updatefound', () => {
				const installing = registration.installing;
				installing?.addEventListener('statechange', () => {
					if (installing.state === 'installed' && navigator.serviceWorker.controller) {
						this.updateReady = true;
					}
				});
			});
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (this.reloading) location.reload();
				else this.offlineReady = true;
			});
			// Look for a new version whenever the app comes to the front (a request to our own origin).
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible' && navigator.onLine) {
					void registration.update().catch(() => {});
				}
			});
		} catch (error) {
			console.error('Service worker registration failed', error);
		}
	}

	/** Activates the waiting worker and reloads into the new version. */
	apply(): void {
		const waiting = this.registration?.waiting;
		if (!waiting) return;
		this.reloading = true;
		waiting.postMessage({ type: 'SKIP_WAITING' });
	}
}

export const pwa = new PwaState();
