import type { SyncStateView } from '$lib/stores/syncState';

export type SyncRequestState = 'idle' | 'syncing' | 'synced' | 'failed';
export type SyncFeedbackLevel =
	| 'idle'
	| 'syncing'
	| 'healthy'
	| 'stale'
	| 'partial'
	| 'failed';

export interface SyncFeedbackView {
	level: SyncFeedbackLevel;
	label: string;
	description: string;
	isStale: boolean;
	isPartial: boolean;
	isFailed: boolean;
	shouldShowCachedContent: boolean;
}

export interface SummarizeSyncFeedbackInput {
	syncState: SyncStateView;
	nowMs: number;
	requestState?: SyncRequestState;
	staleThresholdMs?: number;
	hasLocalContent?: boolean;
}

interface RelayHealthSummary {
	relayCount: number;
	staleRelayCount: number;
}

function summarizeRelays(
	relays: SyncStateView['relays'],
	nowMs: number,
	staleThresholdMs: number
): RelayHealthSummary {
	const latestByRelay = new Map<string, number>();

	for (const row of relays) {
		const current = latestByRelay.get(row.relay);
		if (current === undefined || current < row.updatedAt) {
			latestByRelay.set(row.relay, row.updatedAt);
		}
	}

	let staleRelayCount = 0;
	for (const latest of latestByRelay.values()) {
		if (nowMs - latest > staleThresholdMs) {
			staleRelayCount += 1;
		}
	}

	return {
		relayCount: latestByRelay.size,
		staleRelayCount
	};
}

export function summarizeSyncFeedback(input: SummarizeSyncFeedbackInput): SyncFeedbackView {
	const requestState = input.requestState ?? 'idle';
	const staleThresholdMs = input.staleThresholdMs ?? 5 * 60 * 1000;
	const hasLocalContent = input.hasLocalContent ?? false;
	const relaySummary = summarizeRelays(input.syncState.relays, input.nowMs, staleThresholdMs);
	const hasRelayState = relaySummary.relayCount > 0;
	const allRelaysStale = hasRelayState && relaySummary.staleRelayCount === relaySummary.relayCount;
	const someRelaysStale =
		hasRelayState &&
		relaySummary.staleRelayCount > 0 &&
		relaySummary.staleRelayCount < relaySummary.relayCount;

	if (requestState === 'syncing' || input.syncState.isSyncing) {
		return {
			level: 'syncing',
			label: 'syncing',
			description: 'Relay sync laeuft. Lokaler Cache bleibt sichtbar.',
			isStale: false,
			isPartial: false,
			isFailed: false,
			shouldShowCachedContent: hasRelayState || hasLocalContent
		};
	}

	if (requestState === 'failed') {
		if (hasRelayState || hasLocalContent) {
			return {
				level: hasRelayState ? 'partial' : 'failed',
				label: hasRelayState ? 'partial failure' : 'sync failed',
				description: hasRelayState
					? 'Ein Sync-Versuch ist fehlgeschlagen. Lokaler Cache bleibt nutzbar.'
					: 'Sync fehlgeschlagen. Lokaler Cache bleibt sichtbar.',
				isStale: someRelaysStale || allRelaysStale,
				isPartial: hasRelayState,
				isFailed: true,
				shouldShowCachedContent: true
			};
		}

		return {
			level: 'failed',
			label: 'sync failed',
			description: 'Kein Relay-Datenstand verfuegbar. Retry empfohlen.',
			isStale: false,
			isPartial: false,
			isFailed: true,
			shouldShowCachedContent: false
		};
	}

	if (!hasRelayState) {
		return {
			level: 'idle',
			label: 'no relay state',
			description: 'Noch kein Relay-Sync-Zustand vorhanden.',
			isStale: false,
			isPartial: false,
			isFailed: false,
			shouldShowCachedContent: hasLocalContent
		};
	}

	if (someRelaysStale) {
		return {
			level: 'partial',
			label: 'partial relay',
			description: 'Ein Teil der Relays ist veraltet. Cache bleibt sichtbar.',
			isStale: true,
			isPartial: true,
			isFailed: false,
			shouldShowCachedContent: true
		};
	}

	if (allRelaysStale) {
		return {
			level: 'stale',
			label: 'cache stale',
			description: 'Alle Relay-Staende sind veraltet. Retry empfohlen.',
			isStale: true,
			isPartial: false,
			isFailed: false,
			shouldShowCachedContent: true
		};
	}

	return {
		level: 'healthy',
		label: 'relay healthy',
		description: 'Relay sync ist aktuell.',
		isStale: false,
		isPartial: false,
		isFailed: false,
		shouldShowCachedContent: true
	};
}
