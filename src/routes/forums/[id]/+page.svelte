<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import {
		createBrowserNip07Signer,
		createSimplePoolPublisher,
		createWriteFlowService
	} from '$lib/actions';
	import { ensureDemoData } from '$lib/data/db';
	import { syncGeneralListFromWpEndpoint } from '$lib/provisioning/wpMembers';
	import {
		computeForumDashboardThreads,
		isSyncStateStale,
		type ForumDashboardFilter,
		type ForumDashboardSort
	} from '$lib/routes/forumDashboard';
	import {
		createForumRouteStores,
		DEFAULT_ROUTE_USER_PUBKEY
	} from '$lib/routes/contracts';
	import { notifyError, notifySuccess, notifyWriteStatus } from '$lib/components/ui';
	import { createWriteStatusByEventStore } from '$lib/stores';
	import { createRelaySyncFetcher, syncCommunity } from '$lib/sync';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let communityStore = $state(createForumRouteStores('').communityStore);
	let threadListStore = $state(createForumRouteStores('').threadListStore);
	let syncStateStore = $state(createForumRouteStores('').syncStateStore);
	let wpSyncStatus = $state<'idle' | 'synced' | 'failed'>('idle');
	let importedWpUsers = $state(0);
	let relaySyncStatus = $state<'idle' | 'synced' | 'failed'>('idle');
	let relayFetchedEvents = $state(0);
	let relayUrl = $state('ws://127.0.0.1:7011');
	let writeStatusStore = $state(createWriteStatusByEventStore(''));
	let writeService = $state(createWriteFlowService());
	let newThreadTitle = $state('');
	let newThreadContent = $state('');
	let threadSubmitStatus = $state('');
	let threadSubmitting = $state(false);
	let sortMode = $state<ForumDashboardSort>('latest');
	let filterMode = $state<ForumDashboardFilter>('all');

	const staleThresholdMs = 5 * 60 * 1000;
	const dashboardThreads = $derived(
		computeForumDashboardThreads($threadListStore, $writeStatusStore, {
			sort: sortMode,
			filter: filterMode
		})
	);
	const isCacheStale = $derived(isSyncStateStale($syncStateStore.lastSyncAt, Date.now(), staleThresholdMs));

	$effect(() => {
		const stores = createForumRouteStores(data.forumId);
		communityStore = stores.communityStore;
		threadListStore = stores.threadListStore;
		syncStateStore = stores.syncStateStore;
		writeStatusStore = createWriteStatusByEventStore(data.forumId);
	});

	onMount(async () => {
		writeService = createWriteFlowService({
			signEvent: createBrowserNip07Signer(),
			publishEvent: createSimplePoolPublisher()
		});
		relayUrl = env.PUBLIC_NOSTR_RELAY_URL || 'ws://127.0.0.1:7011';

		await ensureDemoData(data.forumId);
		try {
			const members = await syncGeneralListFromWpEndpoint({
				community: data.forumId,
				endpoint: '/api/wp-members',
				preserveExisting: true
			});
			importedWpUsers = members.length;
			wpSyncStatus = 'synced';
			notifySuccess('WP-Mitglieder synchronisiert', `${members.length} Mitglieder importiert.`);
		} catch (error) {
			console.error('WP member sync failed', error);
			wpSyncStatus = 'failed';
			notifyError('WP-Mitgliedersync fehlgeschlagen');
		}

		try {
			const result = await syncCommunity({
				community: data.forumId,
				relays: [relayUrl],
				streams: ['forum', 'general'],
				fetcher: createRelaySyncFetcher()
			});
			relayFetchedEvents = result.fetchedEvents;
			relaySyncStatus = 'synced';
			notifySuccess('Relay-Sync erfolgreich', `${result.fetchedEvents} Events geladen.`);
		} catch (error) {
			console.error('Relay sync failed', error);
			relaySyncStatus = 'failed';
			notifyError('Relay-Sync fehlgeschlagen');
		}
	});

	function statusLabel(status: string): string {
		if (status === 'pending') return 'pending';
		if (status === 'confirmed') return 'confirmed';
		if (status === 'failed') return 'failed';
		return '';
	}

	function toTimestampMs(value: number): number {
		return value > 2_000_000_000 ? value : value * 1000;
	}

	function formatActivity(value: number): string {
		return new Date(toTimestampMs(value)).toLocaleString();
	}

	function sortLabel(mode: ForumDashboardSort): string {
		return mode === 'latest' ? 'Neueste' : 'Aktivste';
	}

	function filterLabel(mode: ForumDashboardFilter): string {
		if (mode === 'all') return 'Alle';
		if (mode === 'pending') return 'Pending';
		return 'Failed';
	}

	async function submitThread(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		threadSubmitStatus = '';
		const content = newThreadContent.trim();
		if (content.length === 0) {
			threadSubmitStatus = 'Thread-Inhalt darf nicht leer sein.';
			return;
		}

		threadSubmitting = true;
		const result = await writeService.createThread({
			community: data.forumId,
			authorPubkey: DEFAULT_ROUTE_USER_PUBKEY,
			relays: [relayUrl],
			title: newThreadTitle,
			content,
			forumSlug: 'general'
		});
		threadSubmitting = false;

		if (!result.ok) {
			threadSubmitStatus = `Thread nicht erstellt: ${result.message}`;
			notifyError('Thread nicht erstellt', result.message);
			return;
		}

		newThreadTitle = '';
		newThreadContent = '';
		notifyWriteStatus('thread', result.status);
		threadSubmitStatus =
			result.status === 'confirmed'
				? 'Thread erstellt und bestaetigt.'
				: 'Thread lokal erstellt, Relay-Publish fehlgeschlagen (Retry verfuegbar).';
	}
</script>

<svelte:head>
	<title>Forum {data.forumId}</title>
</svelte:head>

<section class="forum-dashboard">
	<header class="dashboard-head">
		<div>
			<h1>Forum Feed</h1>
			<p>Threads in `{data.forumId}`. Fokus auf aktuelle Diskussionen und Schreibstatus.</p>
		</div>
		<div class="dashboard-state">
			{#if relaySyncStatus === 'failed'}
				<span class="dashboard-alert dashboard-alert-error">Relay-Sync fehlgeschlagen</span>
			{:else if isCacheStale}
				<span class="dashboard-alert dashboard-alert-warn">Cache ist moeglicherweise veraltet</span>
			{:else if relaySyncStatus === 'synced'}
				<span class="dashboard-alert dashboard-alert-ok">
					Sync aktiv ({relayFetchedEvents} Events)
				</span>
			{/if}
			{#if wpSyncStatus === 'failed'}
				<span class="dashboard-alert dashboard-alert-error">WP-Import fehlgeschlagen</span>
			{:else if wpSyncStatus === 'synced'}
				<span class="dashboard-alert dashboard-alert-ok">WP-Import: {importedWpUsers}</span>
			{/if}
		</div>
	</header>

	<section class="composer-card" id="new-thread">
		<div class="composer-head">
			<h2>Neuer Thread</h2>
		</div>
		<form onsubmit={submitThread}>
			<label>
				Titel (optional)
				<input type="text" bind:value={newThreadTitle} maxlength="120" />
			</label>
			<label>
				Text
				<textarea bind:value={newThreadContent} rows="5" required></textarea>
			</label>
			<div class="composer-actions">
				<button type="submit" class="ui-button ui-button-primary" disabled={threadSubmitting}>
					{threadSubmitting ? 'Speichert...' : 'Thread erstellen'}
				</button>
				{#if threadSubmitStatus}
					<p>{threadSubmitStatus}</p>
				{/if}
			</div>
		</form>
	</section>

	<section class="feed-controls">
		<div class="control-group">
			<span>Sortierung</span>
			{#each ['latest', 'active'] as mode}
				<button
					type="button"
					class={`ui-button ${sortMode === mode ? 'ui-button-primary' : ''}`}
					onclick={() => (sortMode = mode as ForumDashboardSort)}
				>
					{sortLabel(mode as ForumDashboardSort)}
				</button>
			{/each}
		</div>
		<div class="control-group">
			<span>Filter</span>
			{#each ['all', 'pending', 'failed'] as mode}
				<button
					type="button"
					class={`ui-button ${filterMode === mode ? 'ui-button-primary' : ''}`}
					onclick={() => (filterMode = mode as ForumDashboardFilter)}
				>
					{filterLabel(mode as ForumDashboardFilter)}
				</button>
			{/each}
		</div>
	</section>

	<section class="thread-feed">
		<h2>Threads</h2>
		{#if dashboardThreads.length === 0}
			<div class="empty-state">
				<p>Keine Threads fuer den aktuellen Filter.</p>
			</div>
		{:else}
			<ul class="thread-list">
				{#each dashboardThreads as thread}
					<li>
						<article class="thread-card">
							<header>
								<a href={`/forums/${thread.community}/${thread.rootId}`}>{thread.title}</a>
								{#if thread.writeStatus}
									<span class={`status-pill status-pill-${thread.writeStatus}`}>
										{statusLabel(thread.writeStatus)}
									</span>
								{/if}
							</header>
							<p>
								by {thread.author} | replies {thread.replyCount} | activity {formatActivity(
									thread.lastActivityAt
								)}
							</p>
						</article>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</section>

<style>
	.forum-dashboard {
		display: grid;
		gap: 1rem;
	}

	.dashboard-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.8rem;
	}

	.dashboard-head h1 {
		margin: 0;
		font-size: 1.2rem;
	}

	.dashboard-head p {
		margin: 0.25rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.92rem;
	}

	.dashboard-state {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: flex-end;
	}

	.dashboard-alert {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		font-size: 0.78rem;
	}

	.dashboard-alert-ok {
		color: color-mix(in oklab, var(--chart-1) 75%, black);
		background: color-mix(in oklab, var(--chart-1) 13%, transparent);
	}

	.dashboard-alert-warn {
		color: color-mix(in oklab, var(--chart-2) 80%, black);
		background: color-mix(in oklab, var(--chart-2) 12%, transparent);
	}

	.dashboard-alert-error {
		color: color-mix(in oklab, var(--destructive) 78%, black);
		background: color-mix(in oklab, var(--destructive) 11%, transparent);
	}

	.composer-card {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.9rem;
		background: color-mix(in oklab, var(--card) 93%, transparent);
	}

	.composer-head h2 {
		margin: 0 0 0.65rem;
		font-size: 1rem;
	}

	form {
		display: grid;
		gap: 0.6rem;
	}

	label {
		display: grid;
		gap: 0.25rem;
	}

	textarea,
	input {
		font: inherit;
		padding: 0.4rem 0.5rem;
	}

	.composer-actions {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		flex-wrap: wrap;
	}

	.composer-actions p {
		margin: 0;
		font-size: 0.88rem;
		color: var(--muted-foreground);
	}

	.feed-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
		justify-content: space-between;
	}

	.control-group {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.control-group span {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	.thread-feed h2 {
		margin: 0 0 0.5rem;
		font-size: 1.02rem;
	}

	.thread-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.55rem;
	}

	.thread-card {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.7rem 0.75rem;
		background: color-mix(in oklab, var(--card) 92%, transparent);
	}

	.thread-card header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
	}

	.thread-card header a {
		text-decoration: none;
		font-weight: 600;
	}

	.thread-card p {
		margin: 0.35rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.86rem;
	}

	.empty-state {
		border: 1px dashed var(--border);
		border-radius: var(--radius);
		padding: 0.9rem;
		color: var(--muted-foreground);
		font-size: 0.9rem;
	}

	.status-pill {
		margin-left: 0;
	}
</style>
