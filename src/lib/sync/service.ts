import Dexie from 'dexie';
import type { NostrEventRow, ReactionRow, SyncCursorRow, ThreadHeadRow } from '$lib/data/db';
import { getDb } from '$lib/data/db';
import { normalizeLabels, normalizeReactions } from '$lib/projections';
import { normalizeSyncEvent, toEventRow } from './normalize';
import type { SyncOptions, SyncResult } from './types';

export async function getCursor(
	relay: string,
	community: string,
	stream: string
): Promise<number> {
	const db = getDb();
	if (!db) return 0;
	const row = await db.syncCursor
		.where('[relay+community+stream]')
		.equals([relay, community, stream])
		.first();
	return row?.cursor ?? 0;
}

export async function setCursor(
	relay: string,
	community: string,
	stream: string,
	cursor: number
): Promise<void> {
	const db = getDb();
	if (!db) return;
	await upsertCursor(db, relay, community, stream, cursor);
}

export async function resetCursorsForCommunity(community: string): Promise<void> {
	const db = getDb();
	if (!db) return;
	await db.syncCursor.where('community').equals(community).delete();
}

async function upsertCursor(
	db: NonNullable<ReturnType<typeof getDb>>,
	relay: string,
	community: string,
	stream: string,
	cursor: number
): Promise<void> {
	const existing = await db.syncCursor
		.where('[relay+community+stream]')
		.equals([relay, community, stream])
		.first();

	const row: SyncCursorRow = {
		id: existing?.id,
		relay,
		community,
		stream,
		cursor,
		updatedAt: Date.now()
	};

	await db.syncCursor.put(row);
}

function buildThreadHeads(events: NostrEventRow[], community: string): ThreadHeadRow[] {
	const byRoot = new Map<string, NostrEventRow[]>();
	for (const event of events) {
		const group = byRoot.get(event.rootId) ?? [];
		group.push(event);
		byRoot.set(event.rootId, group);
	}

	const heads: ThreadHeadRow[] = [];
	for (const [rootId, group] of byRoot.entries()) {
		group.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
		const explicitRoot = group.find((event) => event.id === rootId);
		const root = explicitRoot ?? group[0];
		const last = group[group.length - 1];

		heads.push({
			rootId,
			community,
			forumSlug: root.forumSlug,
			title: root.content.slice(0, 80) || `Thread ${rootId.slice(0, 8)}`,
			author: root.pubkey,
			lastActivityAt: last.createdAt,
			replyCount: Math.max(group.length - (explicitRoot ? 1 : 0), 0)
		});
	}

	return heads.sort((a, b) => b.lastActivityAt - a.lastActivityAt || a.rootId.localeCompare(b.rootId));
}

function toReactionRows(
	normalized: ReturnType<typeof normalizeReactions>
): ReactionRow[] {
	return normalized.map((reaction) => ({
		id: reaction.eventId,
		eventId: reaction.eventId,
		community: reaction.community,
		targetId: reaction.targetId,
		author: reaction.author,
		value: reaction.value,
		createdAt: reaction.createdAt
	}));
}

function toLabelRows(normalized: ReturnType<typeof normalizeLabels>) {
	return normalized.map((label) => ({
		id: `${label.eventId}:${label.label}`,
		eventId: label.eventId,
		community: label.community,
		targetId: label.targetId,
		label: label.label,
		reason: label.reason,
		author: label.author,
		createdAt: label.createdAt
	}));
}

export async function syncCommunity(options: SyncOptions): Promise<SyncResult> {
	const db = getDb();
	if (!db) {
		return {
			requests: 0,
			fetchedEvents: 0,
			newEvents: 0,
			cursorUpdates: 0
		};
	}

	const result: SyncResult = {
		requests: 0,
		fetchedEvents: 0,
		newEvents: 0,
		cursorUpdates: 0
	};

	for (const relay of options.relays) {
		for (const stream of options.streams) {
			result.requests += 1;

			const since = await getCursor(relay, options.community, stream);
			const fetched = await options.fetcher({
				relay,
				community: options.community,
				stream,
				since
			});

			result.fetchedEvents += fetched.events.length;
			const normalized = fetched.events
				.map((event) => normalizeSyncEvent(event, options.community))
				.filter((event): event is NonNullable<typeof event> => Boolean(event));

			const uniqueById = new Map<string, (typeof normalized)[number]>();
			for (const event of normalized) {
				if (!uniqueById.has(event.id)) uniqueById.set(event.id, event);
			}
			const deduped = [...uniqueById.values()];
			const dedupedRawEvents = deduped.map((event) => ({
				id: event.id,
				kind: event.kind,
				pubkey: event.pubkey,
				created_at: event.createdAt,
				content: event.content,
				tags: event.tags
			}));
			const eventRows = deduped.map(toEventRow);

			const maxEventCursor = deduped.reduce<number>(
				(max, event) => Math.max(max, event.createdAt),
				since
			);
			const nextCursor = fetched.nextCursor ?? maxEventCursor;

			await db.transaction(
				'rw',
				db.tables,
				async () => {
					const existing = await db.events.bulkGet(eventRows.map((row) => row.id));
					const newRows = eventRows.filter((row, index) => !existing[index]);
					if (newRows.length > 0) {
						await db.events.bulkAdd(newRows);
					}

					const threadEvents = await db.events
						.where('[community+kind+createdAt]')
						.between([options.community, 11, Dexie.minKey], [options.community, 11, Dexie.maxKey])
						.toArray();
					const nextHeads = buildThreadHeads(threadEvents, options.community);
					const currentHeads = await db.threadHeads.where('community').equals(options.community).toArray();
					await db.threadHeads.bulkDelete(currentHeads.map((head) => head.rootId));
					if (nextHeads.length > 0) {
						await db.threadHeads.bulkPut(nextHeads);
					}

					const reactions = toReactionRows(
						normalizeReactions(dedupedRawEvents, options.community)
					);
					if (reactions.length > 0) {
						await db.reactions.bulkPut(reactions);
					}

					const labels = toLabelRows(normalizeLabels(dedupedRawEvents, options.community));
					if (labels.length > 0) {
						await db.labels.bulkPut(labels);
					}

					if (options.beforeCommitHook) {
						await options.beforeCommitHook({
							relay,
							stream,
							community: options.community,
							since,
							nextCursor,
							newEventCount: newRows.length
						});
					}

					await upsertCursor(db, relay, options.community, stream, nextCursor);
					result.newEvents += newRows.length;
					result.cursorUpdates += 1;
				}
			);
		}
	}

	return result;
}
