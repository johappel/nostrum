import Dexie from 'dexie';
import { readable, type Readable } from 'svelte/store';
import { getDb, type ThreadHeadRow } from '$lib/data/db';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export function createThreadListStore(
	community: string,
	forumSlug = 'general'
): Readable<ThreadHeadRow[]> {
	const db = getDb();
	if (!db) return readable([]);

	return liveQueryReadable(
		() =>
			db.threadHeads
				.where('[community+forumSlug+lastActivityAt]')
				.between(
					[community, forumSlug, Dexie.minKey],
					[community, forumSlug, Dexie.maxKey]
				)
				.reverse()
				.toArray(),
		[]
	);
}

