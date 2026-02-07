import { describe, expect, it } from 'vitest';
import { getDb } from '../src/lib/data/db';
import { createPermissionsStore } from '../src/lib/stores/permissions';
import { waitForStore } from './helpers/store';

describe('permissions store', () => {
	it('updates when underlying lists change', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const community = 'community-store-test';
		const user = 'user-1';

		await db.lists.bulkAdd([
			{
				community,
				dTag: 'General',
				members: [],
				updatedAt: 1
			},
			{
				community,
				dTag: 'Moderation',
				members: [],
				updatedAt: 1
			}
		]);

		const store = createPermissionsStore(user, community);

		const initial = await waitForStore(store, (value) => value.canPost === false);
		expect(initial).toEqual({
			canPost: false,
			canReact: false,
			canModerate: false
		});

		await db.lists
			.where('[community+dTag]')
			.equals([community, 'General'])
			.modify({ members: [user], updatedAt: 2 });

		const afterGeneral = await waitForStore(store, (value) => value.canPost === true);
		expect(afterGeneral).toEqual({
			canPost: true,
			canReact: true,
			canModerate: false
		});

		await db.lists
			.where('[community+dTag]')
			.equals([community, 'Moderation'])
			.modify({ members: [user], updatedAt: 3 });

		const afterModeration = await waitForStore(store, (value) => value.canModerate === true);
		expect(afterModeration).toEqual({
			canPost: true,
			canReact: true,
			canModerate: true
		});
	});
});

