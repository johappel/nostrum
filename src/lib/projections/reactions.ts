import type { RawNostrEvent, RawNostrTag } from './types';
import { compareEventsByTimeAndId, getCreatedAt, getFirstTagValue, getTags } from './utils';

export interface ReactionProjection {
	eventId: string;
	targetId: string;
	author: string;
	community: string;
	value: string;
	createdAt: number;
}

function normalizeReaction(event: RawNostrEvent): ReactionProjection | null {
	if (event.kind !== 7) return null;
	if (typeof event.id !== 'string' || event.id.length === 0) return null;
	if (typeof event.pubkey !== 'string' || event.pubkey.length === 0) return null;
	const createdAt = getCreatedAt(event);
	if (createdAt === null) return null;

	const tags: RawNostrTag[] = getTags(event);
	const targetId = getFirstTagValue(tags, 'e');
	const community = getFirstTagValue(tags, 'h');
	const value = typeof event.content === 'string' ? event.content.trim() : '';
	if (!targetId || !community || value.length === 0) return null;

	return {
		eventId: event.id,
		targetId,
		author: event.pubkey,
		community,
		value,
		createdAt
	};
}

export function normalizeReactions(
	events: RawNostrEvent[],
	community?: string
): ReactionProjection[] {
	return events
		.map(normalizeReaction)
		.filter((event): event is ReactionProjection => Boolean(event))
		.filter((event) => !community || event.community === community);
}

export function dedupeLatestReactions(
	reactions: ReactionProjection[]
): ReactionProjection[] {
	const byTargetAndAuthor = new Map<string, ReactionProjection>();
	for (const reaction of reactions) {
		const key = `${reaction.targetId}:${reaction.author}`;
		const existing = byTargetAndAuthor.get(key);
		if (!existing || compareEventsByTimeAndId(existing, reaction) < 0) {
			byTargetAndAuthor.set(key, reaction);
		}
	}
	return [...byTargetAndAuthor.values()].sort(compareEventsByTimeAndId);
}

export function aggregateReactionCounts(
	reactions: ReactionProjection[]
): Record<string, Record<string, number>> {
	const counts: Record<string, Record<string, number>> = {};
	for (const reaction of reactions) {
		counts[reaction.targetId] ??= {};
		counts[reaction.targetId][reaction.value] =
			(counts[reaction.targetId][reaction.value] ?? 0) + 1;
	}
	return counts;
}

export function projectReactionCounts(
	events: RawNostrEvent[],
	community?: string
): Record<string, Record<string, number>> {
	const normalized = normalizeReactions(events, community);
	const deduped = dedupeLatestReactions(normalized);
	return aggregateReactionCounts(deduped);
}

