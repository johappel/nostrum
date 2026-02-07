import { describe, expect, it, vi } from 'vitest';
import { createRelaySyncFetcher } from '../src/lib/sync/relayFetcher';

describe('relay sync fetcher', () => {
	it('queries relay with stream-specific kinds and community h-filter', async () => {
		const querySync = vi.fn(async () => [
			{ id: 'a', kind: 11, pubkey: 'p', created_at: 100, tags: [['h', 'community-a']], content: 'x' }
		]);
		const fetcher = createRelaySyncFetcher({
			pool: { querySync } as any,
			maxWaitMs: 1_111
		});

		const result = await fetcher({
			relay: 'ws://relay.local',
			community: 'community-a',
			stream: 'forum',
			since: 50
		});

		expect(querySync).toHaveBeenCalledWith(
			['ws://relay.local'],
			{
				kinds: [11],
				'#h': ['community-a'],
				since: 51
			},
			{ maxWait: 1_111 }
		);
		expect(result.nextCursor).toBe(100);
		expect(result.events).toHaveLength(1);
	});

	it('falls back to default kinds for unknown streams', async () => {
		const querySync = vi.fn(async () => []);
		const fetcher = createRelaySyncFetcher({
			pool: { querySync } as any,
			defaultKinds: [11, 7]
		});

		await fetcher({
			relay: 'ws://relay.local',
			community: 'community-b',
			stream: 'custom',
			since: 0
		});

		expect(querySync).toHaveBeenCalledWith(
			['ws://relay.local'],
			{
				kinds: [11, 7],
				'#h': ['community-b']
			},
			{ maxWait: 2_500 }
		);
	});
});
