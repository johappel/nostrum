import type { RawNostrEvent, RawNostrTag } from './types';
import { compareEventsByTimeAndId, getCreatedAt, getFirstTagValue, getTagValues, getTags } from './utils';

export interface LabelProjection {
	eventId: string;
	targetId: string;
	author: string;
	community: string;
	label: string;
	reason?: string;
	createdAt: number;
}

export interface LabelsByTargetAndLabel {
	[targetId: string]: Record<string, LabelProjection[]>;
}

function normalizeLabelEvents(event: RawNostrEvent): LabelProjection[] {
	if (event.kind !== 1985) return [];
	if (typeof event.id !== 'string' || event.id.length === 0) return [];
	if (typeof event.pubkey !== 'string' || event.pubkey.length === 0) return [];
	const createdAt = getCreatedAt(event);
	if (createdAt === null) return [];

	const tags: RawNostrTag[] = getTags(event);
	const targetId = getFirstTagValue(tags, 'e');
	const community = getFirstTagValue(tags, 'h');
	const reason = getFirstTagValue(tags, 'reason') ?? undefined;
	const labels = getTagValues(tags, 't');
	if (!targetId || !community || labels.length === 0) return [];

	return labels.map((label) => ({
		eventId: event.id as string,
		targetId,
		author: event.pubkey as string,
		community,
		label,
		reason,
		createdAt
	}));
}

export function normalizeLabels(
	events: RawNostrEvent[],
	community?: string
): LabelProjection[] {
	const rows = events.flatMap((event) => normalizeLabelEvents(event));
	return rows
		.filter((row) => !community || row.community === community)
		.sort(compareEventsByTimeAndId);
}

export function projectLabelsByTargetAndLabel(
	events: RawNostrEvent[],
	community?: string
): LabelsByTargetAndLabel {
	const labels = normalizeLabels(events, community);
	const grouped: LabelsByTargetAndLabel = {};

	for (const label of labels) {
		grouped[label.targetId] ??= {};
		grouped[label.targetId][label.label] ??= [];
		grouped[label.targetId][label.label].push(label);
	}

	return grouped;
}

