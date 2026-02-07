import type { LabelRow } from '$lib/data/db';

export interface ModerationQueueItem {
	targetId: string;
	reportCount: number;
	latestCreatedAt: number;
	latestAuthor: string;
	labels: string[];
	reasons: string[];
}

export interface ModerationPanelView {
	canModerate: boolean;
	showControls: boolean;
	queue: ModerationQueueItem[];
	isEmpty: boolean;
}

export interface MemberPanelView {
	generalMembers: string[];
	moderatorMembers: string[];
	generalCount: number;
	moderatorCount: number;
	visibleGeneralMembers: string[];
	visibleModeratorMembers: string[];
	hiddenGeneralCount: number;
	hiddenModeratorCount: number;
}

function compareQueueItems(a: ModerationQueueItem, b: ModerationQueueItem): number {
	if (a.latestCreatedAt !== b.latestCreatedAt) return b.latestCreatedAt - a.latestCreatedAt;
	if (a.reportCount !== b.reportCount) return b.reportCount - a.reportCount;
	return a.targetId.localeCompare(b.targetId);
}

function uniqueSorted(values: string[]): string[] {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function buildModerationQueue(labels: LabelRow[]): ModerationQueueItem[] {
	const byTarget = new Map<string, ModerationQueueItem>();

	for (const label of labels) {
		if (!label.label.startsWith('mod:')) continue;

		const current =
			byTarget.get(label.targetId) ??
			({
				targetId: label.targetId,
				reportCount: 0,
				latestCreatedAt: label.createdAt,
				latestAuthor: label.author,
				labels: [],
				reasons: []
			} satisfies ModerationQueueItem);

		current.reportCount += 1;
		current.labels.push(label.label);
		if (label.reason && label.reason.trim().length > 0) {
			current.reasons.push(label.reason.trim());
		}
		if (label.createdAt > current.latestCreatedAt) {
			current.latestCreatedAt = label.createdAt;
			current.latestAuthor = label.author;
		}

		byTarget.set(label.targetId, current);
	}

	return [...byTarget.values()]
		.map((item) => ({
			...item,
			labels: uniqueSorted(item.labels),
			reasons: uniqueSorted(item.reasons)
		}))
		.sort(compareQueueItems);
}

export function buildModerationPanelView(
	canModerate: boolean,
	queue: ModerationQueueItem[]
): ModerationPanelView {
	return {
		canModerate,
		showControls: canModerate,
		queue,
		isEmpty: queue.length === 0
	};
}

export function buildMemberPanelView(input: {
	generalMembers: string[];
	moderatorMembers: string[];
	maxVisible?: number;
}): MemberPanelView {
	const maxVisible = input.maxVisible ?? 6;
	const generalMembers = uniqueSorted(input.generalMembers);
	const moderatorMembers = uniqueSorted(input.moderatorMembers);

	const visibleGeneralMembers = generalMembers.slice(0, maxVisible);
	const visibleModeratorMembers = moderatorMembers.slice(0, maxVisible);

	return {
		generalMembers,
		moderatorMembers,
		generalCount: generalMembers.length,
		moderatorCount: moderatorMembers.length,
		visibleGeneralMembers,
		visibleModeratorMembers,
		hiddenGeneralCount: Math.max(generalMembers.length - visibleGeneralMembers.length, 0),
		hiddenModeratorCount: Math.max(moderatorMembers.length - visibleModeratorMembers.length, 0)
	};
}
