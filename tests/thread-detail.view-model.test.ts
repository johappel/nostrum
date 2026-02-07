import { describe, expect, it } from 'vitest';
import {
	buildThreadTimeline,
	getFailedRowsForTarget,
	isMissingFocusPost,
	mapTargetWriteStates
} from '../src/lib/routes/threadDetailView';
import type { NostrEventRow, PendingWriteRow } from '../src/lib/data/db';

function makeEvent(id: string, createdAt: number): NostrEventRow {
	return {
		id,
		kind: 11,
		pubkey: `author-${id}`,
		createdAt,
		community: 'community-test',
		forumSlug: 'general',
		rootId: 'root-1',
		content: `content-${id}`
	};
}

describe('thread detail view model', () => {
	it('keeps focus on selected post for /forums/:id/:thread_id/:post_id', () => {
		const root = makeEvent('root-1', 100);
		const replies = [makeEvent('reply-1', 110), makeEvent('reply-2', 120)];

		const timeline = buildThreadTimeline(root, replies, 'reply-2');
		expect(timeline.find((item) => item.id === 'reply-2')?.isFocused).toBe(true);
		expect(timeline.find((item) => item.id === 'root-1')?.isFocused).toBe(false);
		expect(isMissingFocusPost(timeline, 'reply-2')).toBe(false);
	});

	it('exposes pending states per target for reaction/report actions', () => {
		const rows: PendingWriteRow[] = [
			{
				id: 1,
				eventId: 'e-1',
				community: 'community-test',
				kind: 7,
				action: 'reaction',
				targetId: 'root-1',
				author: 'a',
				status: 'pending',
				attemptCount: 0,
				signedEvent: '{}',
				createdAt: 1,
				updatedAt: 10
			},
			{
				id: 2,
				eventId: 'e-2',
				community: 'community-test',
				kind: 1985,
				action: 'report',
				targetId: 'root-1',
				author: 'a',
				status: 'confirmed',
				attemptCount: 1,
				signedEvent: '{}',
				createdAt: 1,
				updatedAt: 11
			}
		];

		const byTarget = mapTargetWriteStates(rows);
		expect(byTarget['root-1']?.pendingCount).toBe(1);
		expect(byTarget['root-1']?.confirmedCount).toBe(1);
		expect(byTarget['root-1']?.latestStatusByAction.reaction).toBe('pending');
		expect(byTarget['root-1']?.latestStatusByAction.report).toBe('confirmed');
	});

	it('keeps failed writes retry-visible for target', () => {
		const rows: PendingWriteRow[] = [
			{
				id: 4,
				eventId: 'e-4',
				community: 'community-test',
				kind: 7,
				action: 'reaction',
				targetId: 'reply-1',
				author: 'a',
				status: 'failed',
				attemptCount: 2,
				signedEvent: '{}',
				createdAt: 1,
				updatedAt: 20
			},
			{
				id: 5,
				eventId: 'e-5',
				community: 'community-test',
				kind: 1985,
				action: 'report',
				targetId: 'reply-1',
				author: 'a',
				status: 'failed',
				attemptCount: 1,
				signedEvent: '{}',
				createdAt: 1,
				updatedAt: 21
			}
		];

		const byTarget = mapTargetWriteStates(rows);
		const failedRows = getFailedRowsForTarget(byTarget, 'reply-1');
		expect(failedRows.map((row) => row.id)).toEqual([5, 4]);
		expect(byTarget['reply-1']?.failedCount).toBe(2);
	});
});
