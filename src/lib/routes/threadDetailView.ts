import type { NostrEventRow, PendingWriteAction, PendingWriteRow, PendingWriteStatus } from '$lib/data/db';

export interface ThreadTimelineItem {
	id: string;
	content: string;
	author: string;
	createdAt: number;
	isRoot: boolean;
	isFocused: boolean;
}

export interface TargetWriteState {
	targetId: string;
	pendingCount: number;
	confirmedCount: number;
	failedCount: number;
	latestStatusByAction: Partial<Record<PendingWriteAction, PendingWriteStatus>>;
	failedRows: PendingWriteRow[];
}

export function buildThreadTimeline(
	root: NostrEventRow | null,
	replies: NostrEventRow[],
	focusedPostId: string | null
): ThreadTimelineItem[] {
	if (!root) return [];

	const sortedReplies = [...replies].sort(
		(a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)
	);

	return [root, ...sortedReplies].map((event, index) => ({
		id: event.id,
		content: event.content,
		author: event.pubkey,
		createdAt: event.createdAt,
		isRoot: index === 0,
		isFocused: focusedPostId !== null && focusedPostId === event.id
	}));
}

export function isMissingFocusPost(
	timeline: ThreadTimelineItem[],
	focusedPostId: string | null
): boolean {
	if (focusedPostId === null) return false;
	return !timeline.some((item) => item.id === focusedPostId);
}

export function mapTargetWriteStates(rows: PendingWriteRow[]): Record<string, TargetWriteState> {
	const byTarget: Record<string, TargetWriteState> = {};
	const latestByTargetAction = new Map<string, number>();

	for (const row of rows) {
		if (!row.targetId) continue;
		const current =
			byTarget[row.targetId] ??
			({
				targetId: row.targetId,
				pendingCount: 0,
				confirmedCount: 0,
				failedCount: 0,
				latestStatusByAction: {},
				failedRows: []
			} satisfies TargetWriteState);

		if (row.status === 'pending') current.pendingCount += 1;
		if (row.status === 'confirmed') current.confirmedCount += 1;
		if (row.status === 'failed') {
			current.failedCount += 1;
			current.failedRows.push(row);
		}

		const actionKey = `${row.targetId}:${row.action}`;
		const latestUpdatedAt = latestByTargetAction.get(actionKey);
		if (latestUpdatedAt === undefined || latestUpdatedAt <= row.updatedAt) {
			latestByTargetAction.set(actionKey, row.updatedAt);
			current.latestStatusByAction[row.action] = row.status;
		}

		byTarget[row.targetId] = current;
	}

	for (const state of Object.values(byTarget)) {
		state.failedRows.sort((a, b) => {
			if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
			return (a.id ?? 0) - (b.id ?? 0);
		});
	}

	return byTarget;
}

export function getFailedRowsForTarget(
	targetStateMap: Record<string, TargetWriteState>,
	targetId: string
): PendingWriteRow[] {
	return targetStateMap[targetId]?.failedRows ?? [];
}
