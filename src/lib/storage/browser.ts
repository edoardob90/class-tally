import { createDexieRepository } from './dexie';
import type { Repository } from './repository';

let repository: Repository | undefined;

/** The app-wide repository on IndexedDB. Created lazily, in the browser only. */
export function getRepository(): Repository {
	repository ??= createDexieRepository();
	return repository;
}
