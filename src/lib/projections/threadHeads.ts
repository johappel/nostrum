import type { RawNostrEvent, RawNostrTag } from './types';
import { compareEventsByTimeAndId, getCreatedAt, getFirstTagValue, getTagValues, getTags } from './utils';

export interface ThreadHeadProjection {
	rootId: string;
	community: string;
	forumSlug: string;
	title: string;
	author: string;
	lastActivityAt: number;
	replyCount: number;
}

interface NormalizedThreadEvent {
	eventId: string;
	kind: number;
	pubkey: string;
	createdAt: number;
	content: string;
	tags: RawNostrTag[];
	community: string;
	rootId: string;
	forumSlug: string;
}

function getForumSlug(tags: RawNostrTag[]): string {
	const forumTag = getTagValues(tags, 't').find((value) => value.startsWith('forum:'));
	if (!forumTag) return 'general';

	const slug = forumTag.slice('forum:'.length).trim().toLowerCase();
	return slug.length > 0 ? slug : 'general';
}

function getRootId(eventId: string, tags: RawNostrTag[]): string {
	const eTags = tags.filter((tag) => tag[0] === 'e' && typeof tag[1] === 'string' && tag[1].length > 0);
	if (eTags.length === 0) return eventId;

	const rootTag = eTags.find((tag) => tag[3] === 'root');
	return rootTag?.[1] ?? eTags[0][1];
}

function getTitle(event: NormalizedThreadEvent): string {
	const tagTitle = getFirstTagValue(event.tags, 'title');
	if (tagTitle) return tagTitle;

	const content = event.content.trim();
	if (content.length > 0) return content.slice(0, 80);
	return `Thread ${event.rootId.slice(0, 8)}`;
}

function normalize(events: RawNostrEvent[], community: string): NormalizedThreadEvent[] {
	const byId = new Map<string, NormalizedThreadEvent>();

	for (const event of events) {
		if (event.kind !== 11) continue;
		if (typeof event.id !== 'string' || event.id.length === 0) continue;
		if (typeof event.pubkey !== 'string' || event.pubkey.length === 0) continue;
		const createdAt = getCreatedAt(event);
		if (createdAt === null) continue;

		const tags = getTags(event);
		const eventCommunity = getFirstTagValue(tags, 'h');
		if (!eventCommunity || eventCommunity !== community) continue;

		const normalized: NormalizedThreadEvent = {
			eventId: event.id,
			kind: event.kind,
			pubkey: event.pubkey,
			createdAt,
			content: typeof event.content === 'string' ? event.content : '',
			tags,
			community: eventCommunity,
			rootId: getRootId(event.id, tags),
			forumSlug: getForumSlug(tags)
		};

		const existing = byId.get(normalized.eventId);
		if (!existing || compareEventsByTimeAndId(existing, normalized) < 0) {
			byId.set(normalized.eventId, normalized);
		}
	}

	return [...byId.values()];
}

export function projectThreadHeads(events: RawNostrEvent[], community: string): ThreadHeadProjection[] {
	const normalized = normalize(events, community);
	const byRoot = new Map<string, NormalizedThreadEvent[]>();

	for (const event of normalized) {
		const group = byRoot.get(event.rootId) ?? [];
		group.push(event);
		byRoot.set(event.rootId, group);
	}

	const heads: ThreadHeadProjection[] = [];
	for (const [rootId, group] of byRoot.entries()) {
		group.sort(compareEventsByTimeAndId);
		const explicitRoot = group.find((event) => event.eventId === rootId);
		const rootEvent = explicitRoot ?? group[0];
		const lastActivityAt = group[group.length - 1].createdAt;
		const replyCount = Math.max(group.length - (explicitRoot ? 1 : 0), 0);

		heads.push({
			rootId,
			community,
			forumSlug: rootEvent.forumSlug,
			title: getTitle(rootEvent),
			author: rootEvent.pubkey,
			lastActivityAt,
			replyCount
		});
	}

	return heads.sort((a, b) => b.lastActivityAt - a.lastActivityAt || a.rootId.localeCompare(b.rootId));
}

