import type { NostrEventRow } from '$lib/data/db';
import type { RawNostrEvent } from '$lib/projections';
import { getCreatedAt, getFirstTagValue, getTagValues, getTags } from '$lib/projections/utils';
import type { NormalizedSyncEvent } from './types';

function parseForumSlug(tags: string[][]): string {
	const forumTag = getTagValues(tags, 't').find((value) => value.startsWith('forum:'));
	if (!forumTag) return 'general';
	const slug = forumTag.slice('forum:'.length).trim().toLowerCase();
	return slug.length > 0 ? slug : 'general';
}

function parseRootId(eventId: string, tags: string[][]): string {
	const eTags = tags.filter((tag) => tag[0] === 'e' && typeof tag[1] === 'string' && tag[1].length > 0);
	if (eTags.length === 0) return eventId;
	const root = eTags.find((tag) => tag[3] === 'root');
	return root?.[1] ?? eTags[0][1];
}

export function normalizeSyncEvent(
	event: RawNostrEvent,
	expectedCommunity: string
): NormalizedSyncEvent | null {
	if (typeof event.id !== 'string' || event.id.length === 0) return null;
	if (typeof event.kind !== 'number') return null;
	if (typeof event.pubkey !== 'string' || event.pubkey.length === 0) return null;
	const createdAt = getCreatedAt(event);
	if (createdAt === null) return null;
	const tags = getTags(event);
	const community = getFirstTagValue(tags, 'h');
	if (!community || community !== expectedCommunity) return null;

	const title = getFirstTagValue(tags, 'title') ?? '';
	return {
		id: event.id,
		kind: event.kind,
		pubkey: event.pubkey,
		createdAt,
		community,
		forumSlug: parseForumSlug(tags),
		rootId: parseRootId(event.id, tags),
		title,
		content: typeof event.content === 'string' ? event.content : '',
		tags
	};
}

export function toEventRow(event: NormalizedSyncEvent): NostrEventRow {
	return {
		id: event.id,
		kind: event.kind,
		pubkey: event.pubkey,
		createdAt: event.createdAt,
		community: event.community,
		forumSlug: event.forumSlug,
		rootId: event.rootId,
		content: event.content
	};
}

