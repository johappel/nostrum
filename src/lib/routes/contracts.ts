import {
	createCommunityStore,
	createPermissionsStore,
	createSyncStateStore,
	createThreadDetailStore,
	createThreadListStore
} from '$lib/stores';
import type { CommunityView } from '$lib/stores/community';
import type { PermissionsView } from '$lib/permissions';
import type { SyncStateView } from '$lib/stores/syncState';
import type { ThreadDetailView } from '$lib/stores/threadDetail';
import type { ThreadHeadRow } from '$lib/data/db';
import type { Readable } from 'svelte/store';

export interface ForumRouteData {
	forumId: string;
}

export interface ThreadRouteData extends ForumRouteData {
	threadId: string;
}

export interface ThreadPostRouteData extends ThreadRouteData {
	postId: string;
}

export function mapForumRouteData(params: { id?: string }): ForumRouteData {
	return { forumId: params.id ?? '' };
}

export function mapThreadRouteData(params: {
	id?: string;
	thread_id?: string;
}): ThreadRouteData {
	return {
		forumId: params.id ?? '',
		threadId: params.thread_id ?? ''
	};
}

export function mapThreadPostRouteData(params: {
	id?: string;
	thread_id?: string;
	post_id?: string;
}): ThreadPostRouteData {
	return {
		forumId: params.id ?? '',
		threadId: params.thread_id ?? '',
		postId: params.post_id ?? ''
	};
}

export interface ForumRouteStores {
	forumId: string;
	communityStore: Readable<CommunityView | null>;
	threadListStore: Readable<ThreadHeadRow[]>;
	syncStateStore: Readable<SyncStateView>;
}

export interface ThreadRouteStores {
	forumId: string;
	threadId: string;
	threadStore: Readable<ThreadDetailView>;
	permissionsStore: Readable<PermissionsView>;
}

export interface RouteStoreDeps {
	createCommunityStore: typeof createCommunityStore;
	createThreadListStore: typeof createThreadListStore;
	createSyncStateStore: typeof createSyncStateStore;
	createThreadDetailStore: typeof createThreadDetailStore;
	createPermissionsStore: typeof createPermissionsStore;
}

const defaultDeps: RouteStoreDeps = {
	createCommunityStore,
	createThreadListStore,
	createSyncStateStore,
	createThreadDetailStore,
	createPermissionsStore
};

export const DEFAULT_ROUTE_USER_PUBKEY = 'npub_demo_user_1';

export function createForumRouteStores(
	forumId: string,
	deps: RouteStoreDeps = defaultDeps
): ForumRouteStores {
	return {
		forumId,
		communityStore: deps.createCommunityStore(forumId),
		threadListStore: deps.createThreadListStore(forumId, 'general'),
		syncStateStore: deps.createSyncStateStore(forumId)
	};
}

export function refreshForumRouteStores(
	current: ForumRouteStores,
	forumId: string,
	deps: RouteStoreDeps = defaultDeps
): ForumRouteStores {
	if (current.forumId === forumId) return current;
	return createForumRouteStores(forumId, deps);
}

export function createThreadRouteStores(
	forumId: string,
	threadId: string,
	deps: RouteStoreDeps = defaultDeps
): ThreadRouteStores {
	return {
		forumId,
		threadId,
		threadStore: deps.createThreadDetailStore(forumId, threadId),
		permissionsStore: deps.createPermissionsStore(DEFAULT_ROUTE_USER_PUBKEY, forumId)
	};
}

export function refreshThreadRouteStores(
	current: ThreadRouteStores,
	forumId: string,
	threadId: string,
	deps: RouteStoreDeps = defaultDeps
): ThreadRouteStores {
	if (current.forumId === forumId && current.threadId === threadId) return current;
	return createThreadRouteStores(forumId, threadId, deps);
}
