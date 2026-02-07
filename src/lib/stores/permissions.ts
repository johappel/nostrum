import { readable, type Readable } from 'svelte/store';
import { getDb } from '$lib/data/db';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export interface PermissionsView {
	canPost: boolean;
	canReact: boolean;
	canModerate: boolean;
}

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
		const general = lists.find((list) => list.dTag === 'General');
		const moderation = lists.find((list) => list.dTag === 'Moderation');

		const canPost = general?.members.includes(userPubkey) ?? false;
		const canModerate = moderation?.members.includes(userPubkey) ?? false;

		return {
			canPost,
			canReact: canPost,
			canModerate
		};
	}, {
		canPost: false,
		canReact: false,
		canModerate: false
	});
}

