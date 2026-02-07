import { describe, expect, it } from 'vitest';
import { summarizeSyncFeedback } from '../src/lib/routes/syncFeedback';
import type { SyncStateView } from '../src/lib/stores/syncState';

function makeState(input: Partial<SyncStateView> = {}): SyncStateView {
	return {
		isSyncing: false,
		lastSyncAt: null,
		relays: [],
		...input
	};
}

describe('sync feedback view model', () => {
	it('keeps cached content visible on failed sync when relay state exists', () => {
		const view = summarizeSyncFeedback({
			syncState: makeState({
				relays: [
					{
						relay: 'wss://relay-1.example',
						stream: 'forum',
						updatedAt: 1_000
					}
				]
			}),
			nowMs: 10_000,
			requestState: 'failed',
			hasLocalContent: true
		});

		expect(view.isFailed).toBe(true);
		expect(view.shouldShowCachedContent).toBe(true);
	});

	it('marks stale cache when relay state is older than threshold', () => {
		const view = summarizeSyncFeedback({
			syncState: makeState({
				relays: [
					{
						relay: 'wss://relay-1.example',
						stream: 'forum',
						updatedAt: 1_000
					}
				]
			}),
			nowMs: 10_000,
			requestState: 'synced',
			staleThresholdMs: 5_000
		});

		expect(view.level).toBe('stale');
		expect(view.isStale).toBe(true);
	});

	it('marks partial relay state when only some relays are stale', () => {
		const view = summarizeSyncFeedback({
			syncState: makeState({
				relays: [
					{
						relay: 'wss://relay-1.example',
						stream: 'forum',
						updatedAt: 9_000
					},
					{
						relay: 'wss://relay-2.example',
						stream: 'forum',
						updatedAt: 1_000
					}
				]
			}),
			nowMs: 10_000,
			staleThresholdMs: 5_000
		});

		expect(view.level).toBe('partial');
		expect(view.isPartial).toBe(true);
		expect(view.shouldShowCachedContent).toBe(true);
	});
});
