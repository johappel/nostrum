import { readable, type Readable } from 'svelte/store';
import { getDb } from '$lib/data/db';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export interface SyncStateView {
	isSyncing: boolean;
	lastSyncAt: number | null;
	relays: Array<{ relay: string; stream: string; updatedAt: number }>;
}

export function createSyncStateStore(community: string): Readable<SyncStateView> {
	const db = getDb();
	if (!db) {
		return readable({
			isSyncing: false,
			lastSyncAt: null,
			relays: []
		});
	}

	return liveQueryReadable(async () => {
		const cursors = await db.syncCursor.where('community').equals(community).toArray();
		const lastSyncAt = cursors.reduce<number | null>(
			(max, row) => (max === null ? row.updatedAt : Math.max(max, row.updatedAt)),
			null
		);

		return {
			isSyncing: false,
			lastSyncAt,
			relays: cursors.map((row) => ({
				relay: row.relay,
				stream: row.stream,
				updatedAt: row.updatedAt
			}))
		};
	}, {
		isSyncing: false,
		lastSyncAt: null,
		relays: []
	});
}

