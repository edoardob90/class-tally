export type PersistenceState = 'persisted' | 'not-persisted' | 'unsupported';

/** Whether the browser promised not to clear this origin's storage on its own. */
export async function getPersistence(): Promise<PersistenceState> {
	try {
		if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'unsupported';
		return (await navigator.storage.persisted()) ? 'persisted' : 'not-persisted';
	} catch {
		return 'unsupported';
	}
}

/** Asks the browser for persistent storage. Resolves to whether it was granted. */
export async function requestPersistence(): Promise<boolean> {
	try {
		if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
		return await navigator.storage.persist();
	} catch {
		return false;
	}
}
