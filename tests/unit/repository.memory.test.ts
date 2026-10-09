import { createMemoryRepository } from '../../src/lib/storage';
import { runRepositoryContract } from './repository.contract';

runRepositoryContract('in-memory', (deps) => createMemoryRepository(deps));
