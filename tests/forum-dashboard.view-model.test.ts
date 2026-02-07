import { describe, expect, it } from 'vitest';
import {
	computeForumDashboardThreads,
	isSyncStateStale
} from '../src/lib/routes/forumDashboard';
import type { PendingWriteStatus, ThreadHeadRow } from '../src/lib/data/db';

function makeThread(
	rootId: string,
	input: {
		lastActivityAt: number;
		replyCount: number;
	}
): ThreadHeadRow {
	return {
		rootId,
		community: 'community-test',
		forumSlug: 'general',
		title: `Thread ${rootId}`,
		author: `author-${rootId}`,
		lastActivityAt: input.lastActivityAt,
		replyCount: input.replyCount
	};
}

describe('forum dashboard view model', () => {
	it('sorts by latest activity deterministically', () => {
		const threads = [
			makeThread('a', { lastActivityAt: 100, replyCount: 3 }),
			makeThread('b', { lastActivityAt: 120, replyCount: 1 }),
			makeThread('c', { lastActivityAt: 120, replyCount: 5 })
		];

		const result = computeForumDashboardThreads(threads, {}, {
			sort: 'latest',
			filter: 'all'
		});

		expect(result.map((thread) => thread.rootId)).toEqual(['c', 'b', 'a']);
	});

	it('sorts by active using reply count first', () => {
		const threads = [
			makeThread('a', { lastActivityAt: 130, replyCount: 1 }),
			makeThread('b', { lastActivityAt: 110, replyCount: 5 }),
			makeThread('c', { lastActivityAt: 125, replyCount: 5 })
		];

		const result = computeForumDashboardThreads(threads, {}, {
			sort: 'active',
			filter: 'all'
		});

		expect(result.map((thread) => thread.rootId)).toEqual(['c', 'b', 'a']);
	});

	it('filters by pending and failed statuses', () => {
		const threads = [
			makeThread('a', { lastActivityAt: 100, replyCount: 1 }),
			makeThread('b', { lastActivityAt: 100, replyCount: 1 }),
			makeThread('c', { lastActivityAt: 100, replyCount: 1 })
		];
		const statusMap: Record<string, PendingWriteStatus> = {
			a: 'pending',
			b: 'failed',
			c: 'confirmed'
		};

		const pending = computeForumDashboardThreads(threads, statusMap, {
			sort: 'latest',
			filter: 'pending'
		});
		const failed = computeForumDashboardThreads(threads, statusMap, {
			sort: 'latest',
			filter: 'failed'
		});

		expect(pending.map((thread) => thread.rootId)).toEqual(['a']);
		expect(failed.map((thread) => thread.rootId)).toEqual(['b']);
	});

	it('marks stale sync only after threshold', () => {
		const now = 10_000;
		expect(isSyncStateStale(now - 1_000, now, 5_000)).toBe(false);
		expect(isSyncStateStale(now - 6_000, now, 5_000)).toBe(true);
		expect(isSyncStateStale(null, now, 5_000)).toBe(false);
	});
});
