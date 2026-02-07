import { readable, type Readable } from 'svelte/store';
import { getDb } from '$lib/data/db';
import { evaluatePermissionsFromLists, type PermissionsView } from '$lib/permissions';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export function createPermissionsStore(
	userPubkey: string,
	community: string
): Readable<PermissionsView> {
	const db = getDb();
	if (!db) {
		return readable({
			canPost: false,
			canReact: false,
			canModerate: false
		});
	}

	return liveQueryReadable(async () => {
		const lists = await db.lists.where('community').equals(community).toArray();
		return evaluatePermissionsFromLists({ userPubkey, lists });
	}, {
		canPost: false,
		canReact: false,
		canModerate: false
	});
}
