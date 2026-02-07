<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createBrowserNip07Signer,
		createSimplePoolPublisher,
		createWriteFlowService,
		type WriteActionResult
	} from '$lib/actions';
	import ThreadActionBar from '$lib/components/thread/ThreadActionBar.svelte';
	import { notifyError, notifyWriteStatus } from '$lib/components/ui';
	import type { PendingWriteRow } from '$lib/data/db';
	import { createThreadRouteStores } from '$lib/routes/contracts';
	import { DEFAULT_ROUTE_USER_PUBKEY } from '$lib/routes/contracts';
	import {
		buildThreadTimeline,
		getFailedRowsForTarget,
		isMissingFocusPost,
		mapTargetWriteStates
	} from '$lib/routes/threadDetailView';
	import { ensureDemoData } from '$lib/data/db';
	import { createPendingWritesStore } from '$lib/stores';

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
	let writeService = $state(createWriteFlowService());
	let actionStatus = $state('');
	let actionBusy = $state(false);

	const timeline = $derived(buildThreadTimeline($threadStore.root, $threadStore.replies, postId));
	const missingFocus = $derived(isMissingFocusPost(timeline, postId));
	const targetWriteStates = $derived(mapTargetWriteStates($pendingWritesStore));
	const activeTargetId = $derived(postId ?? $threadStore.root?.id ?? '');
	const rootItem = $derived(timeline.find((item) => item.isRoot) ?? null);
	const replyItems = $derived(timeline.filter((item) => !item.isRoot));

	$effect(() => {
		const stores = createThreadRouteStores(forumId, threadId);
		threadStore = stores.threadStore;
		permissionsStore = stores.permissionsStore;
		pendingWritesStore = createPendingWritesStore(forumId);
	});

	$effect(() => {
		void ensureDemoData(forumId);
	});

	onMount(() => {
		writeService = createWriteFlowService({
			signEvent: createBrowserNip07Signer(),
			publishEvent: createSimplePoolPublisher()
		});
	});

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

		if (row.action === 'reaction' || row.action === 'report') {
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
