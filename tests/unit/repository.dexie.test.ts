import 'fake-indexeddb/auto';
import { createDexieRepository } from '../../src/lib/storage';
import { runRepositoryContract } from './repository.contract';

let n = 0;
runRepositoryContract('Dexie on IndexedDB', (deps) =>
	createDexieRepository({ ...deps, dbName: `class-tally-test-${++n}` })
);
