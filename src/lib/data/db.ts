import Dexie, { type Table } from 'dexie';

export interface NostrEventRow {
	id: string;
	kind: number;
	pubkey: string;
	createdAt: number;
	community: string;
	forumSlug: string;
	rootId: string;
	content: string;
}

export interface SectionRow {
	id?: number;
	community: string;
	section: string;
	kinds: number[];
	listRef: string;
}

export interface ListRow {
	id?: number;
	community: string;
	dTag: string;
	members: string[];
	updatedAt: number;
}

export interface ThreadHeadRow {
	rootId: string;
	community: string;
	forumSlug: string;
	title: string;
	author: string;
	lastActivityAt: number;
	replyCount: number;
}

export interface ReactionRow {
	id: string;
	eventId: string;
	community: string;
	targetId: string;
	author: string;
	value: string;
	createdAt: number;
}

export interface LabelRow {
	id: string;
	eventId: string;
	community: string;
	targetId: string;
	label: string;
	reason?: string;
	author: string;
	createdAt: number;
}

export interface SyncCursorRow {
	id?: number;
	relay: string;
	community: string;
	stream: string;
	cursor: number;
	updatedAt: number;
}

class NostrumDb extends Dexie {
	events!: Table<NostrEventRow, string>;
	sections!: Table<SectionRow, number>;
	lists!: Table<ListRow, number>;
	threadHeads!: Table<ThreadHeadRow, string>;
	reactions!: Table<ReactionRow, string>;
	labels!: Table<LabelRow, string>;
	syncCursor!: Table<SyncCursorRow, number>;

	constructor() {
		super('nostrum-db');
		this.version(1).stores({
			events: 'id, kind, pubkey, createdAt, community, forumSlug, rootId, [community+kind+createdAt], [community+rootId+createdAt]',
			sections: '++id, community, section, [community+section]',
			lists: '++id, community, dTag, [community+dTag], updatedAt',
			threadHeads: 'rootId, community, forumSlug, lastActivityAt, [community+forumSlug+lastActivityAt]',
			reactions: '++id, targetId, author, value, createdAt, [targetId+author]',
			labels: '++id, targetId, label, reason, author, createdAt, [targetId+label+createdAt]',
			syncCursor: '++id, relay, community, stream, cursor, updatedAt, [relay+community+stream]'
		});
		this.version(2).stores({
			events: 'id, kind, pubkey, createdAt, community, forumSlug, rootId, [community+kind+createdAt], [community+rootId+createdAt]',
			sections: '++id, community, section, [community+section]',
			lists: '++id, community, dTag, [community+dTag], updatedAt',
			threadHeads: 'rootId, community, forumSlug, lastActivityAt, [community+forumSlug+lastActivityAt]',
			reactions: 'id, eventId, community, targetId, author, value, createdAt, [targetId+author], [community+targetId]',
			labels: 'id, eventId, community, targetId, label, reason, author, createdAt, [targetId+label+createdAt], [community+targetId]',
			syncCursor: '++id, relay, community, stream, cursor, updatedAt, [relay+community+stream]'
		});
	}
}

let dbInstance: NostrumDb | null = null;

function hasIndexedDbRuntime(): boolean {
	return typeof indexedDB !== 'undefined' && typeof IDBKeyRange !== 'undefined';
}

export function getDb(): NostrumDb | null {
	if (!hasIndexedDbRuntime()) return null;
	if (!dbInstance) dbInstance = new NostrumDb();
	return dbInstance;
}

export async function resetDbForTests(): Promise<void> {
	if (!dbInstance) return;
	dbInstance.close();
	await dbInstance.delete();
	dbInstance = null;
}

export async function ensureDemoData(community: string): Promise<void> {
	const db = getDb();
	if (!db) return;

	const existing = await db.threadHeads.where('community').equals(community).count();
	if (existing > 0) return;

	const now = Date.now();
	const rootId = `${community}-thread-welcome`;
	const replyId = `${community}-reply-1`;

	await db.transaction('rw', db.tables, async () => {
		await db.sections.bulkAdd([
			{
				community,
				section: 'General',
				kinds: [1111, 7, 1985],
				listRef: `30000:${community}:General`
			},
			{
				community,
				section: 'Forum',
				kinds: [11],
				listRef: `30000:${community}:General`
			}
		]);

		await db.lists.add({
			community,
			dTag: 'General',
			members: ['npub_demo_user_1', 'npub_demo_mod_1'],
			updatedAt: now
		});

		await db.lists.add({
			community,
			dTag: 'Moderation',
			members: ['npub_demo_mod_1'],
			updatedAt: now
		});

		await db.events.bulkAdd([
			{
				id: rootId,
				kind: 11,
				pubkey: 'npub_demo_user_1',
				createdAt: now - 10_000,
				community,
				forumSlug: 'general',
				rootId,
				content: 'Willkommen im Demo-Forum'
			},
			{
				id: replyId,
				kind: 11,
				pubkey: 'npub_demo_user_1',
				createdAt: now - 5_000,
				community,
				forumSlug: 'general',
				rootId,
				content: 'Erste Antwort im Thread'
			}
		]);

		await db.threadHeads.add({
			rootId,
			community,
			forumSlug: 'general',
			title: 'Willkommen',
			author: 'npub_demo_user_1',
			lastActivityAt: now - 5_000,
			replyCount: 1
		});

		await db.reactions.bulkAdd([
			{
				id: `${rootId}:npub_demo_user_1:heart`,
				eventId: `${rootId}:reaction:1`,
				community,
				targetId: rootId,
				author: 'npub_demo_user_1',
				value: ':heart:',
				createdAt: now - 4_000
			},
			{
				id: `${rootId}:npub_demo_mod_1:plus`,
				eventId: `${rootId}:reaction:2`,
				community,
				targetId: rootId,
				author: 'npub_demo_mod_1',
				value: '+',
				createdAt: now - 3_000
			}
		]);

		await db.syncCursor.bulkAdd([
			{
				relay: 'wss://relay.example',
				community,
				stream: 'forum',
				cursor: Math.floor(now / 1000),
				updatedAt: now
			},
			{
				relay: 'wss://relay.example',
				community,
				stream: 'general',
				cursor: Math.floor(now / 1000),
				updatedAt: now
			}
		]);
	});
}
