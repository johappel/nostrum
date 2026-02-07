import { ensureDemoData, getDb, resetDbForTests } from '../../src/lib/data/db';

export async function seedCommunity(community: string): Promise<void> {
	await ensureDemoData(community);
}

export async function clearDb(): Promise<void> {
	await resetDbForTests();
}

export async function tableCounts() {
	const db = getDb();
	if (!db) {
		throw new Error('Database unavailable in test runtime');
	}

	return {
		sections: await db.sections.count(),
		lists: await db.lists.count(),
		events: await db.events.count(),
		threadHeads: await db.threadHeads.count(),
		reactions: await db.reactions.count(),
		labels: await db.labels.count(),
		syncCursor: await db.syncCursor.count()
	};
}

