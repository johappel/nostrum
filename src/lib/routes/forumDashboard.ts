import type { PendingWriteRow, PendingWriteStatus, ThreadHeadRow } from '$lib/data/db';

export type ForumDashboardSort = 'latest' | 'active';
export type ForumDashboardFilter = 'all' | 'pending' | 'failed';

export interface ForumDashboardThread extends ThreadHeadRow {
	writeStatus?: PendingWriteStatus;
}

export interface ThreadRetryCandidate {
	eventId: string;
	pendingId: number;
	attemptCount: number;
	updatedAt: number;
	errorMessage?: string;
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

function isMoreRecentPendingRow(
	candidate: PendingWriteRow,
	current: PendingWriteRow
): boolean {
	if (candidate.updatedAt !== current.updatedAt) {
		return candidate.updatedAt > current.updatedAt;
	}
	const candidateId = candidate.id ?? Number.MAX_SAFE_INTEGER;
	const currentId = current.id ?? Number.MAX_SAFE_INTEGER;
	return candidateId < currentId;
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

export function computeThreadRetryCandidates(
	rows: PendingWriteRow[]
): Record<string, ThreadRetryCandidate> {
	const latestByEvent = new Map<string, PendingWriteRow>();

	for (const row of rows) {
		if (row.action !== 'thread') continue;
		const existing = latestByEvent.get(row.eventId);
		if (!existing || isMoreRecentPendingRow(row, existing)) {
			latestByEvent.set(row.eventId, row);
		}
	}

	const output: Record<string, ThreadRetryCandidate> = {};
	for (const [eventId, row] of latestByEvent.entries()) {
		if (row.status !== 'failed' || row.id === undefined) continue;
		output[eventId] = {
			eventId,
			pendingId: row.id,
			attemptCount: row.attemptCount,
			updatedAt: row.updatedAt,
			errorMessage: row.errorMessage
		};
	}

	return output;
}
