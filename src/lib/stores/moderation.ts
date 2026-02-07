import { readable, type Readable } from 'svelte/store';
import { getDb, type LabelRow } from '$lib/data/db';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export function createModerationLabelsStore(community: string): Readable<LabelRow[]> {
	const db = getDb();
	if (!db) return readable([]);

	return liveQueryReadable(
		() => db.labels.where('community').equals(community).reverse().sortBy('createdAt'),
		[]
	);
}
