import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { resetDbForTests } from '../src/lib/data/db';

afterEach(async () => {
	await resetDbForTests();
});

