import type { RawNostrEvent, RawNostrTag } from './types';

export function getCreatedAt(event: RawNostrEvent): number | null {
	if (Number.isFinite(event.created_at)) return Number(event.created_at);
	if (Number.isFinite(event.createdAt)) return Number(event.createdAt);
	return null;
}

export function getTags(event: RawNostrEvent): RawNostrTag[] {
	return Array.isArray(event.tags) ? event.tags.filter((tag) => Array.isArray(tag)) : [];
}

export function getTagValues(tags: RawNostrTag[], key: string): string[] {
	return tags
		.filter((tag) => tag[0] === key && typeof tag[1] === 'string' && tag[1].length > 0)
		.map((tag) => tag[1]);
}

export function getFirstTagValue(tags: RawNostrTag[], key: string): string | null {
	const values = getTagValues(tags, key);
	return values.length > 0 ? values[0] : null;
}

export function compareEventsByTimeAndId(
	a: { createdAt: number; eventId: string },
	b: { createdAt: number; eventId: string }
): number {
	if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
	return a.eventId.localeCompare(b.eventId);
}

