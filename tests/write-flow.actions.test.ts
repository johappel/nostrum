import { describe, expect, it } from 'vitest';
import { createWriteFlowService, type SignEventFn, type SignedNostrEvent } from '../src/lib/actions';
import { getDb } from '../src/lib/data/db';
import { createThreadListStore } from '../src/lib/stores';
import { waitForStore } from './helpers/store';

function createTestSigner(prefix: string): { signEvent: SignEventFn; getCallCount: () => number } {
	let callCount = 0;
	return {
		getCallCount: () => callCount,
		signEvent: async (event) => {
			callCount += 1;
			return {
				...event,
				id: `${prefix}-${callCount}`,
				sig: `sig-${prefix}-${callCount}`
			} as SignedNostrEvent;
		}
	};
}

describe('write flow service', () => {
	it('creates a thread optimistically and exposes it via thread list store immediately', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const signer = createTestSigner('opt');
		let releasePublish!: () => void;
		const publishGate = new Promise<void>((resolve) => {
			releasePublish = () => resolve();
		});

		const service = createWriteFlowService({
			signEvent: signer.signEvent,
			publishEvent: async () => {
				await publishGate;
			},
			resolvePermissions: async () => ({ canPost: true, canReact: true, canModerate: true }),
			nowMs: () => 1_700_000_000_000
		});

		const community = 'community-write-optimistic';
		const createPromise = service.createThread({
			community,
			authorPubkey: 'author-1',
			relays: ['wss://relay-1'],
			title: 'Optimistic thread',
			content: 'Thread body',
			forumSlug: 'general'
		});

		const listStore = createThreadListStore(community, 'general');
		const listValue = await waitForStore(listStore, (rows) =>
			rows.some((row) => row.rootId === 'opt-1')
		);
		expect(listValue.some((row) => row.rootId === 'opt-1')).toBe(true);

		const pendingBeforePublish = await db.pendingWrites.where('eventId').equals('opt-1').first();
		expect(pendingBeforePublish?.status).toBe('pending');
		expect(pendingBeforePublish?.attemptCount).toBe(0);

		releasePublish();
		const result = await createPromise;
		expect(result).toMatchObject({
			ok: true,
			eventId: 'opt-1',
			status: 'confirmed'
		});

		const pendingAfterPublish = await db.pendingWrites.where('eventId').equals('opt-1').first();
		expect(pendingAfterPublish?.status).toBe('confirmed');
		expect(pendingAfterPublish?.attemptCount).toBe(1);
	});

	it('marks publish success as confirmed', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const signer = createTestSigner('ok');
		const service = createWriteFlowService({
			signEvent: signer.signEvent,
			publishEvent: async () => {},
			resolvePermissions: async () => ({ canPost: true, canReact: true, canModerate: true }),
			nowMs: () => 1_700_000_010_000
		});

		const result = await service.createThread({
			community: 'community-write-confirmed',
			authorPubkey: 'author-2',
			relays: ['wss://relay-1'],
			content: 'Confirmed thread',
			forumSlug: 'general'
		});

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error('Expected successful write result');
		expect(result.status).toBe('confirmed');

		const pending = await db.pendingWrites.get(result.pendingId);
		expect(pending?.status).toBe('confirmed');
		expect(pending?.attemptCount).toBe(1);
	});

	it('marks publish failures as failed and retries deterministically without duplicates', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const signer = createTestSigner('retry');
		let shouldFail = true;
		const publishedIds: string[] = [];

		const service = createWriteFlowService({
			signEvent: signer.signEvent,
			publishEvent: async (event) => {
				publishedIds.push(event.id);
				if (shouldFail) throw new Error('relay unavailable');
			},
			resolvePermissions: async () => ({ canPost: true, canReact: true, canModerate: true }),
			nowMs: () => 1_700_000_020_000
		});

		const first = await service.createThread({
			community: 'community-write-retry',
			authorPubkey: 'author-3',
			relays: ['wss://relay-1'],
			content: 'Retry thread',
			forumSlug: 'general'
		});
		expect(first.ok).toBe(true);
		if (!first.ok) throw new Error('Expected initial write result');
		expect(first.status).toBe('failed');

		const failedPending = await db.pendingWrites.get(first.pendingId);
		expect(failedPending?.status).toBe('failed');
		expect(failedPending?.attemptCount).toBe(1);

		shouldFail = false;
		const retried = await service.retryPendingWrite({
			pendingId: first.pendingId,
			relays: ['wss://relay-1']
		});
		expect(retried).toMatchObject({
			ok: true,
			eventId: first.eventId,
			status: 'confirmed'
		});

		const confirmedPending = await db.pendingWrites.get(first.pendingId);
		expect(confirmedPending?.status).toBe('confirmed');
		expect(confirmedPending?.attemptCount).toBe(2);
		expect(publishedIds).toEqual([first.eventId, first.eventId]);
		expect(await db.events.count()).toBe(1);
		expect(await db.threadHeads.count()).toBe(1);
	});

	it('creates replies for thread and reply targets while keeping root linkage', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const signer = createTestSigner('reply');
		let nowMs = 1_700_000_040_000;
		const service = createWriteFlowService({
			signEvent: signer.signEvent,
			publishEvent: async () => {},
			resolvePermissions: async () => ({ canPost: true, canReact: true, canModerate: true }),
			nowMs: () => nowMs
		});

		const rootResult = await service.createThread({
			community: 'community-write-replies',
			authorPubkey: 'author-5',
			relays: ['wss://relay-1'],
			content: 'Root thread',
			forumSlug: 'general'
		});
		if (!rootResult.ok) throw new Error('Expected root thread creation to succeed');

		nowMs += 1_000;
		const firstReplyResult = await service.createReply({
			community: 'community-write-replies',
			authorPubkey: 'author-5',
			relays: ['wss://relay-1'],
			threadId: rootResult.eventId,
			content: 'First reply'
		});
		if (!firstReplyResult.ok) throw new Error('Expected first reply creation to succeed');

		nowMs += 1_000;
		const nestedReplyResult = await service.createReply({
			community: 'community-write-replies',
			authorPubkey: 'author-5',
			relays: ['wss://relay-1'],
			threadId: rootResult.eventId,
			replyToId: firstReplyResult.eventId,
			content: 'Nested reply'
		});
		if (!nestedReplyResult.ok) throw new Error('Expected nested reply creation to succeed');

		const firstReplyEvent = await db.events.get(firstReplyResult.eventId);
		const nestedReplyEvent = await db.events.get(nestedReplyResult.eventId);
		expect(firstReplyEvent?.rootId).toBe(rootResult.eventId);
		expect(nestedReplyEvent?.rootId).toBe(rootResult.eventId);

		const nestedPending = await db.pendingWrites.get(nestedReplyResult.pendingId);
		expect(nestedPending?.targetId).toBe(firstReplyResult.eventId);
		expect(nestedPending?.status).toBe('confirmed');

		const head = await db.threadHeads.get(rootResult.eventId);
		expect(head?.replyCount).toBe(2);
		expect(head?.lastActivityAt).toBe(Math.floor(nowMs / 1000));
	});

	it('denies writes on missing permission before signing', async () => {
		const db = getDb();
		if (!db) throw new Error('DB unavailable');

		const signer = createTestSigner('deny');
		const service = createWriteFlowService({
			signEvent: signer.signEvent,
			publishEvent: async () => {},
			resolvePermissions: async () => ({ canPost: false, canReact: false, canModerate: false }),
			nowMs: () => 1_700_000_030_000
		});

		const denied = await service.createThread({
			community: 'community-write-deny',
			authorPubkey: 'author-4',
			relays: ['wss://relay-1'],
			content: 'Denied',
			forumSlug: 'general'
		});

		expect(denied).toMatchObject({
			ok: false,
			reason: 'permission_denied'
		});
		expect(signer.getCallCount()).toBe(0);
		expect(await db.events.count()).toBe(0);
		expect(await db.pendingWrites.count()).toBe(0);
	});
});
