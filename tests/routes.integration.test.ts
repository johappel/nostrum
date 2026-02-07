import { describe, expect, it } from 'vitest';
import { readable } from 'svelte/store';
import { load as forumLoad } from '../src/routes/forums/[id]/+page';
import { load as threadLoad } from '../src/routes/forums/[id]/[thread_id]/+page';
import { load as postLoad } from '../src/routes/forums/[id]/[thread_id]/[post_id]/+page';
import {
	createForumRouteStores,
	createThreadRouteStores,
	mapForumRouteData,
	mapThreadPostRouteData,
	mapThreadRouteData,
	refreshForumRouteStores,
	refreshThreadRouteStores,
	type RouteStoreDeps
} from '../src/lib/routes/contracts';
import { createThreadDetailStore } from '../src/lib/stores/threadDetail';
import { waitForStore } from './helpers/store';

function createMockDeps(): RouteStoreDeps {
	return {
		createCommunityStore: (forumId: string) => readable(`community:${forumId}` as any),
		createThreadListStore: (forumId: string, forumSlug = 'general') =>
			readable(`threads:${forumId}:${forumSlug}` as any),
		createSyncStateStore: (forumId: string) => readable(`sync:${forumId}` as any),
		createThreadDetailStore: (forumId: string, threadId: string) =>
			readable(`thread:${forumId}:${threadId}` as any),
		createPermissionsStore: (_user: string, forumId: string) =>
			readable(`permissions:${forumId}` as any)
	};
}

describe('route data contract', () => {
	it('maps forum route params to forum data', async () => {
		const data = mapForumRouteData({ id: 'demo' });
		expect(data).toEqual({ forumId: 'demo' });

		const loaded = await forumLoad({ params: { id: 'demo' } } as any);
		expect(loaded).toEqual({ forumId: 'demo' });
	});

	it('maps thread route params to thread data', async () => {
		const data = mapThreadRouteData({ id: 'demo', thread_id: 'thread-1' });
		expect(data).toEqual({ forumId: 'demo', threadId: 'thread-1' });

		const loaded = await threadLoad({ params: { id: 'demo', thread_id: 'thread-1' } } as any);
		expect(loaded).toEqual({ forumId: 'demo', threadId: 'thread-1' });
	});

	it('maps post route params to post-focused data', async () => {
		const data = mapThreadPostRouteData({
			id: 'demo',
			thread_id: 'thread-1',
			post_id: 'post-99'
		});
		expect(data).toEqual({
			forumId: 'demo',
			threadId: 'thread-1',
			postId: 'post-99'
		});

		const loaded = await postLoad({
			params: { id: 'demo', thread_id: 'thread-1', post_id: 'post-99' }
		} as any);
		expect(loaded).toEqual({
			forumId: 'demo',
			threadId: 'thread-1',
			postId: 'post-99'
		});
	});
});

describe('route store lifecycle contract', () => {
	it('reuses forum stores when params do not change and recreates when they do', () => {
		const deps = createMockDeps();
		const initial = createForumRouteStores('forum-a', deps);

		const same = refreshForumRouteStores(initial, 'forum-a', deps);
		expect(same).toBe(initial);

		const changed = refreshForumRouteStores(initial, 'forum-b', deps);
		expect(changed).not.toBe(initial);
		expect(changed.forumId).toBe('forum-b');
		expect(changed.communityStore).not.toBe(initial.communityStore);
		expect(changed.threadListStore).not.toBe(initial.threadListStore);
		expect(changed.syncStateStore).not.toBe(initial.syncStateStore);
	});

	it('reuses thread stores when params do not change and recreates when they do', () => {
		const deps = createMockDeps();
		const initial = createThreadRouteStores('forum-a', 'thread-a', deps);

		const same = refreshThreadRouteStores(initial, 'forum-a', 'thread-a', deps);
		expect(same).toBe(initial);

		const changedThread = refreshThreadRouteStores(initial, 'forum-a', 'thread-b', deps);
		expect(changedThread).not.toBe(initial);
		expect(changedThread.threadStore).not.toBe(initial.threadStore);
		expect(changedThread.permissionsStore).not.toBe(initial.permissionsStore);

		const changedForum = refreshThreadRouteStores(initial, 'forum-b', 'thread-a', deps);
		expect(changedForum).not.toBe(initial);
		expect(changedForum.forumId).toBe('forum-b');
	});
});

describe('thread detail not-found contract', () => {
	it('returns stable not-found state for missing thread', async () => {
		const store = createThreadDetailStore('community-missing', 'thread-missing');
		const value = await waitForStore(store, (state) => state.root === null);

		expect(value.root).toBeNull();
		expect(value.replies).toEqual([]);
		expect(value.reactionsByTarget).toEqual({});
		expect(value.labelsByTarget).toEqual({});
	});
});
