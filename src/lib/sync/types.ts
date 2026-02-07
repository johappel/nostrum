import type { RawNostrEvent, RawNostrTag } from '$lib/projections';

export interface SyncFetchInput {
	relay: string;
	community: string;
	stream: string;
	since: number;
}

export interface SyncFetchResult {
	events: RawNostrEvent[];
	nextCursor?: number;
}

export type SyncFetcher = (input: SyncFetchInput) => Promise<SyncFetchResult>;

export interface NormalizedSyncEvent {
	id: string;
	kind: number;
	pubkey: string;
	createdAt: number;
	community: string;
	forumSlug: string;
	rootId: string;
	title: string;
	content: string;
	tags: RawNostrTag[];
}

export interface SyncOptions {
	community: string;
	relays: string[];
	streams: string[];
	fetcher: SyncFetcher;
	beforeCommitHook?: (context: {
		relay: string;
		stream: string;
		community: string;
		since: number;
		nextCursor: number;
		newEventCount: number;
	}) => Promise<void> | void;
}

export interface SyncResult {
	requests: number;
	fetchedEvents: number;
	newEvents: number;
	cursorUpdates: number;
}

