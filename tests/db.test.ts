import { describe, expect, it } from 'vitest';
import { getDb } from '../src/lib/data/db';
import { clearDb, seedCommunity, tableCounts } from './helpers/db';

describe('Dexie foundation', () => {
	it('initializes the DB in test runtime', async () => {
		await clearDb();
		const db = getDb();
		expect(db).not.toBeNull();
		expect(db?.tables.map((table) => table.name).sort()).toEqual([
			'events',
			'labels',
			'lists',
			'reactions',
			'sections',
			'syncCursor',
			'threadHeads'
		]);
	});

	it('seeds demo data with expected baseline rows', async () => {
		await clearDb();
		await seedCommunity('test-community');

		const counts = await tableCounts();
		expect(counts).toEqual({
			sections: 2,
			lists: 2,
			events: 2,
			threadHeads: 1,
			reactions: 2,
			labels: 0,
			syncCursor: 2
		});
	});

	it('seeding is idempotent for the same community', async () => {
		await clearDb();
		await seedCommunity('test-community');
		const first = await tableCounts();

		await seedCommunity('test-community');
		const second = await tableCounts();

		expect(second).toEqual(first);
	});
});

