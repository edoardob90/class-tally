/** Device-local preference, never part of the settings or of backups. */
const KEY = 'class-tally.hints';

function read(): boolean {
	try {
		return globalThis.localStorage?.getItem(KEY) === 'on';
	} catch {
		return false;
	}
}

/** Whether the help hints ("?" toggle) are shown. Remembered on this device only. */
class HintsState {
	on = $state(read());

	toggle(): void {
		this.on = !this.on;
		try {
			globalThis.localStorage?.setItem(KEY, this.on ? 'on' : 'off');
		} catch {
			// Storage blocked (private mode): the toggle still works for this session.
		}
	}
}

export const hints = new HintsState();
