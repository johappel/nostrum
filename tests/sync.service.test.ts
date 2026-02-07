import { describe, expect, it } from 'vitest';
import { getDb } from '../src/lib/data/db';
import { getCursor, setCursor, syncCommunity } from '../src/lib/sync';

function makeThreadEvent(input: {
	id: string;
	pubkey?: string;
	createdAt: number;
	community: string;
	content: string;
	rootId?: string;
	forumSlug?: string;
}): {
	id: string;
	kind: number;
	pubkey: string;
	created_at: number;
	content: string;
	tags: string[][];
} {
	const forumSlug = input.forumSlug ?? 'general';
	const tags: string[][] = [
		['h', input.community],
		['t', `forum:${forumSlug}`]
	];
	if (input.rootId) {
		tags.push(['e', input.rootId, '', 'root']);
	}

	return {
		id: input.id,
		kind: 11,
		pubkey: input.pubkey ?? 'author-1',
		created_at: input.createdAt,
		content: input.content,
		tags
	};
}

describe('sync service', () => {
	it('stores new events once even if fetched from multiple relays', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const community = 'community-sync-dedupe';
		const event = makeThreadEvent({
			id: 'root-sync-1',
			createdAt: 1000,
			community,
			content: 'Hello'
		});

		const fetcher = async () => ({ events: [event], nextCursor: 1000 });

		const result = await syncCommunity({
			community,
			relays: ['wss://relay-1', 'wss://relay-2'],
			streams: ['forum'],
			fetcher
		});

		expect(result.fetchedEvents).toBe(2);
		expect(result.newEvents).toBe(1);
		expect(await db.events.count()).toBe(1);
		expect(await db.threadHeads.count()).toBe(1);
	});

	it('advances cursor only after successful commit and keeps failed batch atomic', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const community = 'community-sync-atomic';
		const relay = 'wss://relay-atomic';
		const stream = 'forum';
		const event = makeThreadEvent({
			id: 'root-sync-atomic',
			createdAt: 2000,
			community,
			content: 'Atomic'
		});

		await expect(
			syncCommunity({
				community,
				relays: [relay],
				streams: [stream],
				fetcher: async () => ({ events: [event], nextCursor: 2000 }),
				beforeCommitHook: () => {
					throw new Error('forced commit failure');
				}
			})
		).rejects.toThrow('forced commit failure');

		expect(await getCursor(relay, community, stream)).toBe(0);
		expect(await db.events.count()).toBe(0);
		expect(await db.threadHeads.count()).toBe(0);

		await syncCommunity({
			community,
			relays: [relay],
			streams: [stream],
			fetcher: async () => ({ events: [event], nextCursor: 2000 })
		});

		expect(await getCursor(relay, community, stream)).toBe(2000);
		expect(await db.events.count()).toBe(1);
		expect(await db.threadHeads.count()).toBe(1);
	});

	it('replay from old cursor produces same projections', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const community = 'community-sync-replay';
		const relay = 'wss://relay-replay';
		const stream = 'forum';
		const root = makeThreadEvent({
			id: 'root-sync-replay',
			createdAt: 3000,
			community,
			content: 'Replay root'
		});
		const reply = makeThreadEvent({
			id: 'reply-sync-replay',
			createdAt: 3100,
			community,
			content: 'Replay reply',
			rootId: 'root-sync-replay'
		});

		const fetcher = async () => ({ events: [root, reply], nextCursor: 3100 });

		await syncCommunity({
			community,
			relays: [relay],
			streams: [stream],
			fetcher
		});

		const firstHeads = await db.threadHeads.where('community').equals(community).toArray();
		const firstCount = await db.events.count();

		await setCursor(relay, community, stream, 0);
		await syncCommunity({
			community,
			relays: [relay],
			streams: [stream],
			fetcher
		});

		const secondHeads = await db.threadHeads.where('community').equals(community).toArray();
		const secondCount = await db.events.count();

		expect(secondCount).toBe(firstCount);
		expect(secondHeads).toEqual(firstHeads);
	});
});

