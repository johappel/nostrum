import { readable, type Readable } from 'svelte/store';
import { getDb } from '$lib/data/db';
import { buildForumHubItems, type ForumHubItem } from '$lib/routes/forumsHub';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export function createForumHubStore(): Readable<ForumHubItem[]> {
	const db = getDb();
	if (!db) return readable([]);

	return liveQueryReadable(async () => {
		const [sections, lists, threadHeads] = await Promise.all([
			db.sections.toArray(),
			db.lists.toArray(),
			db.threadHeads.toArray()
		]);

		return buildForumHubItems({
			sections,
			lists,
			threadHeads
		});
	}, []);
}
