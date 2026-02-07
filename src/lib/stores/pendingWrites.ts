import { readable, type Readable } from 'svelte/store';
import { getDb, type PendingWriteRow, type PendingWriteStatus } from '$lib/data/db';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export function createPendingWritesStore(community: string): Readable<PendingWriteRow[]> {
	const db = getDb();
	if (!db) return readable([]);

	return liveQueryReadable(
		() => db.pendingWrites.where('community').equals(community).reverse().sortBy('updatedAt'),
		[]
	);
}

export function createWriteStatusByEventStore(
	community: string
): Readable<Record<string, PendingWriteStatus>> {
	const db = getDb();
	if (!db) return readable({});

	return liveQueryReadable(async () => {
		const rows = await db.pendingWrites.where('community').equals(community).toArray();
		const byEvent = new Map<string, PendingWriteRow>();

		for (const row of rows) {
			const existing = byEvent.get(row.eventId);
			if (!existing || existing.updatedAt < row.updatedAt) {
				byEvent.set(row.eventId, row);
			}
		}

		const output: Record<string, PendingWriteStatus> = {};
		for (const row of byEvent.values()) {
			output[row.eventId] = row.status;
		}
		return output;
	}, {});
}
