/** Short vibration where the browser supports it (not iOS Safari); the visual feedback always happens. */
export function tap(ms = 12): void {
	try {
		navigator.vibrate?.(ms);
	} catch {
		// Not supported or blocked: nothing to do.
	}
}
