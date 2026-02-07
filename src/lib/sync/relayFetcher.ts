import { SimplePool } from 'nostr-tools/pool';
import type { Filter } from 'nostr-tools/filter';
import type { RawNostrEvent } from '$lib/projections';
import type { SyncFetchInput, SyncFetchResult, SyncFetcher } from './types';

export interface RelaySyncFetcherOptions {
	pool?: SimplePool;
	maxWaitMs?: number;
	defaultKinds?: number[];
	streamKinds?: Record<string, number[]>;
}

const DEFAULT_KINDS_BY_STREAM: Record<string, number[]> = {
	forum: [11],
	general: [1111, 7, 1985]
};

function resolveKinds(stream: string, options: RelaySyncFetcherOptions): number[] {
	const fromOptions = options.streamKinds?.[stream];
	if (fromOptions && fromOptions.length > 0) return fromOptions;

	const fromDefaultMapping = DEFAULT_KINDS_BY_STREAM[stream];
	if (fromDefaultMapping && fromDefaultMapping.length > 0) return fromDefaultMapping;

	const fallback = options.defaultKinds ?? [11, 7, 1985];
	return fallback.length > 0 ? fallback : [11, 7, 1985];
}

function toRawEvents(events: unknown[]): RawNostrEvent[] {
	return events as RawNostrEvent[];
}

export function createRelaySyncFetcher(options: RelaySyncFetcherOptions = {}): SyncFetcher {
	const pool = options.pool ?? new SimplePool({ enablePing: true, enableReconnect: true });
	const maxWait = options.maxWaitMs ?? 2_500;

	return async (input: SyncFetchInput): Promise<SyncFetchResult> => {
		const kinds = resolveKinds(input.stream, options);
		const filter: Filter = {
			kinds,
			'#h': [input.community]
		};
		if (input.since > 0) {
			filter.since = input.since + 1;
		}

		const events = await pool.querySync([input.relay], filter, { maxWait });
		const nextCursor = events.reduce<number>(
			(max, event) => Math.max(max, event.created_at ?? input.since),
			input.since
		);

		return {
			events: toRawEvents(events),
			nextCursor
		};
	};
}
