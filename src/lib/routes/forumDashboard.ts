import type { PendingWriteStatus, ThreadHeadRow } from '$lib/data/db';

export type ForumDashboardSort = 'latest' | 'active';
export type ForumDashboardFilter = 'all' | 'pending' | 'failed';

export interface ForumDashboardThread extends ThreadHeadRow {
	writeStatus?: PendingWriteStatus;
}

interface ComputeForumDashboardThreadsInput {
	sort: ForumDashboardSort;
	filter: ForumDashboardFilter;
}

function activeComparator(a: ForumDashboardThread, b: ForumDashboardThread): number {
	if (a.replyCount !== b.replyCount) return b.replyCount - a.replyCount;
	if (a.lastActivityAt !== b.lastActivityAt) return b.lastActivityAt - a.lastActivityAt;
	return a.rootId.localeCompare(b.rootId);
}

function latestComparator(a: ForumDashboardThread, b: ForumDashboardThread): number {
	if (a.lastActivityAt !== b.lastActivityAt) return b.lastActivityAt - a.lastActivityAt;
	if (a.replyCount !== b.replyCount) return b.replyCount - a.replyCount;
	return a.rootId.localeCompare(b.rootId);
}

function matchesFilter(thread: ForumDashboardThread, filter: ForumDashboardFilter): boolean {
	if (filter === 'all') return true;
	if (filter === 'pending') return thread.writeStatus === 'pending';
	return thread.writeStatus === 'failed';
}

export function computeForumDashboardThreads(
	threads: ThreadHeadRow[],
	writeStatusByEvent: Record<string, PendingWriteStatus>,
	input: ComputeForumDashboardThreadsInput
): ForumDashboardThread[] {
	const enriched: ForumDashboardThread[] = threads.map((thread) => ({
		...thread,
		writeStatus: writeStatusByEvent[thread.rootId]
	}));

	const filtered = enriched.filter((thread) => matchesFilter(thread, input.filter));
	return filtered.sort(input.sort === 'active' ? activeComparator : latestComparator);
}

export function isSyncStateStale(
	lastSyncAt: number | null,
	nowMs: number,
	thresholdMs = 5 * 60 * 1000
): boolean {
	if (lastSyncAt === null) return false;
	return nowMs - lastSyncAt > thresholdMs;
}
