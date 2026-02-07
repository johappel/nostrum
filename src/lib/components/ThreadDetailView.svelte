<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createBrowserNip07Signer,
		createSimplePoolPublisher,
		createWriteFlowService,
		type WriteActionResult
	} from '$lib/actions';
	import SyncFeedbackBanner from '$lib/components/sync/SyncFeedbackBanner.svelte';
	import ThreadActionBar from '$lib/components/thread/ThreadActionBar.svelte';
	import { notifyError, notifySuccess, notifyWriteStatus } from '$lib/components/ui';
	import type { PendingWriteRow } from '$lib/data/db';
	import { createThreadRouteStores } from '$lib/routes/contracts';
	import { DEFAULT_ROUTE_USER_PUBKEY } from '$lib/routes/contracts';
	import { summarizeSyncFeedback, type SyncRequestState } from '$lib/routes/syncFeedback';
	import {
		buildThreadTimeline,
		getFailedRowsForTarget,
		isMissingFocusPost,
		mapTargetWriteStates
	} from '$lib/routes/threadDetailView';
	import { ensureDemoData } from '$lib/data/db';
	import { createPendingWritesStore, createSyncStateStore } from '$lib/stores';
	import { createRelaySyncFetcher, syncCommunity } from '$lib/sync';

	let {
		forumId,
		threadId,
		postId = null,
		relayUrl = 'ws://127.0.0.1:7011'
	}: {
		forumId: string;
		threadId: string;
		postId?: string | null;
		relayUrl?: string;
	} = $props();

	let threadStore = $state(createThreadRouteStores('', '').threadStore);
	let permissionsStore = $state(createThreadRouteStores('', '').permissionsStore);
	let pendingWritesStore = $state(createPendingWritesStore(''));
	let syncStateStore = $state(createSyncStateStore(''));
	let writeService = $state(createWriteFlowService());
	let actionStatus = $state('');
	let actionBusy = $state(false);
	let relaySyncStatus = $state<SyncRequestState>('idle');
	let relaySyncBusy = $state(false);
	let relayFetchedEvents = $state(0);
	let nowMs = $state(Date.now());
	let replyDraft = $state('');
	let replyParentId = $state<string | null>(null);

	const timeline = $derived(buildThreadTimeline($threadStore.root, $threadStore.replies, postId));
	const missingFocus = $derived(isMissingFocusPost(timeline, postId));
	const targetWriteStates = $derived(mapTargetWriteStates($pendingWritesStore));
	const activeTargetId = $derived(postId ?? $threadStore.root?.id ?? '');
	const rootItem = $derived(timeline.find((item) => item.isRoot) ?? null);
	const replyItems = $derived(timeline.filter((item) => !item.isRoot));
	const rootId = $derived($threadStore.root?.id ?? threadId);
	const replyTargetId = $derived(replyParentId ?? rootId);
	const syncFeedback = $derived(
		summarizeSyncFeedback({
			syncState: $syncStateStore,
			nowMs,
			requestState: relaySyncStatus,
			hasLocalContent: timeline.length > 0
		})
	);

	$effect(() => {
		const stores = createThreadRouteStores(forumId, threadId);
		threadStore = stores.threadStore;
		permissionsStore = stores.permissionsStore;
		pendingWritesStore = createPendingWritesStore(forumId);
		syncStateStore = createSyncStateStore(forumId);
	});

	$effect(() => {
		void ensureDemoData(forumId);
	});

	onMount(() => {
		writeService = createWriteFlowService({
			signEvent: createBrowserNip07Signer(),
			publishEvent: createSimplePoolPublisher()
		});
		const timerId = window.setInterval(() => {
			nowMs = Date.now();
		}, 30_000);
		void runRelaySync('initial');
		return () => {
			window.clearInterval(timerId);
		};
	});

	async function runRelaySync(trigger: 'initial' | 'retry'): Promise<void> {
		if (relaySyncBusy) return;
		relaySyncBusy = true;
		relaySyncStatus = 'syncing';
		try {
			const result = await syncCommunity({
				community: forumId,
				relays: [relayUrl],
				streams: ['forum', 'general'],
				fetcher: createRelaySyncFetcher()
			});
			relayFetchedEvents = result.fetchedEvents;
			relaySyncStatus = 'synced';
			if (trigger === 'retry') {
				notifySuccess('Thread-Sync erneut ausgefuehrt', `${result.fetchedEvents} Events geladen.`);
			}
		} catch (error) {
			console.error('Thread relay sync failed', error);
			relaySyncStatus = 'failed';
			notifyError('Thread-Sync fehlgeschlagen');
		} finally {
			relaySyncBusy = false;
			nowMs = Date.now();
		}
	}

	function toTimestampMs(value: number): number {
		return value > 2_000_000_000 ? value : value * 1000;
	}

	function formatCreatedAt(value: number): string {
		return new Date(toTimestampMs(value)).toLocaleString();
	}

	function statusCounts(targetId: string): { pending: number; failed: number; confirmed: number } {
		const state = targetWriteStates[targetId];
		if (!state) return { pending: 0, failed: 0, confirmed: 0 };
		return {
			pending: state.pendingCount,
			failed: state.failedCount,
			confirmed: state.confirmedCount
		};
	}

	function failedRows(targetId: string): PendingWriteRow[] {
		return getFailedRowsForTarget(targetWriteStates, targetId);
	}

	function setReplyTarget(targetId: string): void {
		replyParentId = targetId;
	}

	async function handleWriteResult(action: 'reaction' | 'report', result: WriteActionResult): Promise<void> {
		if (!result.ok) {
			const label = action === 'reaction' ? 'Reaktion' : 'Report';
			actionStatus = `${label} fehlgeschlagen: ${result.message}`;
			notifyError(`${label} fehlgeschlagen`, result.message);
			return;
		}

		notifyWriteStatus(action, result.status);
		actionStatus =
			action === 'reaction'
				? result.status === 'confirmed'
					? 'Reaktion bestaetigt.'
					: 'Reaktion lokal gespeichert, Relay-Publish fehlgeschlagen.'
				: result.status === 'confirmed'
					? 'Report bestaetigt.'
					: 'Report lokal gespeichert, Relay-Publish fehlgeschlagen.';
	}

	async function sendReaction(input: { targetId: string; value: string }): Promise<void> {
		actionBusy = true;
		actionStatus = '';
		const result = await writeService.createReaction({
			community: forumId,
			authorPubkey: DEFAULT_ROUTE_USER_PUBKEY,
			relays: [relayUrl],
			targetId: input.targetId,
			value: input.value
		});
		actionBusy = false;
		await handleWriteResult('reaction', result);
	}

	async function sendReport(input: { targetId: string; reason: string }): Promise<void> {
		actionBusy = true;
		actionStatus = '';
		const result = await writeService.createReport({
			community: forumId,
			authorPubkey: DEFAULT_ROUTE_USER_PUBKEY,
			relays: [relayUrl],
			targetId: input.targetId,
			reason: input.reason
		});
		actionBusy = false;
		await handleWriteResult('report', result);
	}

	async function sendReply(): Promise<void> {
		const content = replyDraft.trim();
		if (content.length === 0) {
			actionStatus = 'Antwort darf nicht leer sein.';
			return;
		}

		actionBusy = true;
		actionStatus = '';
		const result = await writeService.createReply({
			community: forumId,
			authorPubkey: DEFAULT_ROUTE_USER_PUBKEY,
			relays: [relayUrl],
			threadId: rootId,
			replyToId: replyTargetId === rootId ? undefined : replyTargetId,
			forumSlug: $threadStore.root?.forumSlug ?? 'general',
			content
		});
		actionBusy = false;

		if (!result.ok) {
			actionStatus = `Antwort fehlgeschlagen: ${result.message}`;
			notifyError('Antwort fehlgeschlagen', result.message);
			return;
		}

		notifyWriteStatus('thread', result.status);
		actionStatus =
			result.status === 'confirmed'
				? 'Antwort bestaetigt.'
				: 'Antwort lokal gespeichert, Relay-Publish fehlgeschlagen.';
		replyDraft = '';
		replyParentId = null;
	}

	async function retryFailedWrite(row: PendingWriteRow): Promise<void> {
		if (!row.id) {
			notifyError('Retry nicht moeglich', 'Pending write without persistent id.');
			return;
		}

		actionBusy = true;
		const result = await writeService.retryPendingWrite({
			pendingId: row.id,
			relays: [relayUrl]
		});
		actionBusy = false;

		if (!result.ok) {
			notifyError('Retry fehlgeschlagen', result.message);
			actionStatus = `Retry fehlgeschlagen: ${result.message}`;
			return;
		}

		if (row.action === 'reaction' || row.action === 'report' || row.action === 'thread') {
			notifyWriteStatus(row.action, result.status);
		}
		actionStatus =
			result.status === 'confirmed'
				? 'Retry erfolgreich, Event bestaetigt.'
				: 'Retry erneut fehlgeschlagen.';
	}
</script>

<svelte:head>
	<title>Thread {threadId} in Forum {forumId}</title>
</svelte:head>

<p><a href={`/forums/${forumId}`}>Zurueck zum Forum</a></p>
<h1>Forum: {forumId}</h1>
<SyncFeedbackBanner
	view={syncFeedback}
	showRetry={syncFeedback.isFailed || syncFeedback.isStale || syncFeedback.isPartial}
	retryBusy={relaySyncBusy}
	onRetry={() => runRelaySync('retry')}
/>
{#if relaySyncStatus === 'synced'}
	<p class="sync-meta">Relay events (letzter Lauf): {relayFetchedEvents}</p>
{/if}

{#if !$threadStore.root}
	<p>Thread nicht gefunden.</p>
{:else}
	<section class="thread-detail">
		{#if missingFocus}
			<p class="focus-missing">Hinweis: Beitrag `{postId}` nicht gefunden.</p>
		{/if}

		{#if rootItem}
			<article
				class={`post-card post-root ${rootItem.isFocused ? 'post-focused' : ''}`}
				id={rootItem.id}
			>
				<header>
					<h2>{rootItem.content}</h2>
					<div class="meta-row">
						<span>Autor: {rootItem.author}</span>
						<span>{formatCreatedAt(rootItem.createdAt)}</span>
					</div>
					<div class="meta-row">
						<span>Berechtigungen:</span>
						<span class="status-pill status-pill-confirmed">post {$permissionsStore.canPost ? 'yes' : 'no'}</span>
						<span class="status-pill status-pill-confirmed">react {$permissionsStore.canReact ? 'yes' : 'no'}</span>
						<span class="status-pill status-pill-confirmed">moderate {$permissionsStore.canModerate ? 'yes' : 'no'}</span>
					</div>
					<div class="post-actions">
						<button class="ui-button" type="button" onclick={() => setReplyTarget(rootItem.id)}>
							Im Thread antworten
						</button>
					</div>
				</header>

				<ThreadActionBar
					targetId={activeTargetId}
					reactions={$threadStore.reactionsByTarget[activeTargetId] ?? {}}
					counts={statusCounts(activeTargetId)}
					canReact={$permissionsStore.canReact}
					canModerate={$permissionsStore.canModerate}
					busy={actionBusy}
					onReact={sendReaction}
					onReport={sendReport}
				/>

				{#if failedRows(activeTargetId).length > 0}
					<div class="retry-group">
						<p>Failed writes (retry):</p>
						<ul>
							{#each failedRows(activeTargetId) as row}
								<li>
									<button
										class="ui-button"
										type="button"
										disabled={actionBusy}
										onclick={() => retryFailedWrite(row)}
									>
										Retry {row.action} (attempts: {row.attemptCount})
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</article>
		{/if}

		<section class="reply-section">
			<h3>Antworten ({replyItems.length})</h3>
			{#if replyItems.length === 0}
				<p>Keine Antworten.</p>
			{:else}
				<ul class="reply-list">
					{#each replyItems as item}
						<li>
							<article class={`post-card ${item.isFocused ? 'post-focused' : ''}`} id={item.id}>
								<header>
									<a href={`/forums/${forumId}/${threadId}/${item.id}`}>{item.content}</a>
								</header>
								<div class="meta-row">
									<span>{item.author}</span>
									<span>{formatCreatedAt(item.createdAt)}</span>
								</div>
								<div class="meta-row">
									{#if statusCounts(item.id).pending > 0}
										<span class="status-pill status-pill-pending">pending {statusCounts(item.id).pending}</span>
									{/if}
									{#if statusCounts(item.id).failed > 0}
										<span class="status-pill status-pill-failed">failed {statusCounts(item.id).failed}</span>
									{/if}
								</div>
								<div class="post-actions">
									<button class="ui-button" type="button" onclick={() => setReplyTarget(item.id)}>
										Auf diese Antwort antworten
									</button>
								</div>
								{#if failedRows(item.id).length > 0}
									<div class="retry-group">
										{#each failedRows(item.id) as row}
											<button
												class="ui-button"
												type="button"
												disabled={actionBusy}
												onclick={() => retryFailedWrite(row)}
											>
												Retry {row.action}
											</button>
										{/each}
									</div>
								{/if}
							</article>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="reply-compose" id="reply-compose">
			<h3>Antwort schreiben</h3>
			<p>
				Antwort-Ziel:
				{#if replyTargetId === rootId}
					Thread
				{:else}
					Beitrag `{replyTargetId}`
				{/if}
			</p>
			<label>
				Antworttext
				<textarea
					rows="4"
					bind:value={replyDraft}
					placeholder={`Antwort in Thread ${rootId}`}
				></textarea>
			</label>
			<div class="reply-compose-actions">
				<button
					class="ui-button ui-button-primary"
					type="button"
					disabled={actionBusy || !$permissionsStore.canPost}
					onclick={sendReply}
				>
					Antwort senden
				</button>
				{#if replyTargetId !== rootId}
					<button class="ui-button" type="button" disabled={actionBusy} onclick={() => (replyParentId = null)}>
						Ziel auf Thread zuruecksetzen
					</button>
				{/if}
			</div>
		</section>
	</section>
	{#if actionStatus}
		<p class="action-status">{actionStatus}</p>
	{/if}
{/if}

<style>
	.thread-detail {
		display: grid;
		gap: 0.9rem;
	}

	.sync-meta {
		margin: 0.35rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.84rem;
	}

	.focus-missing {
		margin: 0;
		padding: 0.45rem 0.6rem;
		border-radius: var(--radius);
		border: 1px solid color-mix(in oklab, var(--destructive) 45%, transparent);
		background: color-mix(in oklab, var(--destructive) 10%, transparent);
		color: color-mix(in oklab, var(--destructive) 80%, black);
		font-size: 0.88rem;
	}

	.post-card {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem 0.85rem;
		background: color-mix(in oklab, var(--card) 92%, transparent);
	}

	.post-root h2 {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.35;
	}

	.post-focused {
		outline: 2px solid color-mix(in oklab, var(--ring) 80%, transparent);
		outline-offset: 1px;
	}

	.meta-row {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
		color: var(--muted-foreground);
		font-size: 0.84rem;
		margin-top: 0.4rem;
	}

	.post-actions {
		margin-top: 0.6rem;
	}

	.reply-section h3 {
		margin: 0;
		font-size: 1rem;
	}

	.reply-list {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.55rem;
	}

	.reply-list a {
		text-decoration: none;
		font-weight: 550;
	}

	.reply-compose {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem 0.85rem;
		background: color-mix(in oklab, var(--card) 92%, transparent);
		display: grid;
		gap: 0.5rem;
	}

	.reply-compose h3 {
		margin: 0;
		font-size: 1rem;
	}

	.reply-compose p {
		margin: 0;
		font-size: 0.86rem;
		color: var(--muted-foreground);
	}

	.reply-compose label {
		display: grid;
		gap: 0.3rem;
		font-size: 0.88rem;
	}

	.reply-compose textarea {
		font: inherit;
		padding: 0.45rem 0.55rem;
		min-height: 4.8rem;
	}

	.reply-compose-actions {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.retry-group {
		margin-top: 0.6rem;
	}

	.retry-group p {
		margin: 0 0 0.4rem;
		font-size: 0.82rem;
		color: var(--muted-foreground);
	}

	.retry-group ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.action-status {
		margin: 0;
		font-size: 0.88rem;
		color: var(--muted-foreground);
	}
</style>
