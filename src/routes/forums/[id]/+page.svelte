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
		createForumRouteStores,
		DEFAULT_ROUTE_USER_PUBKEY
	} from '$lib/routes/contracts';
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
		} catch (error) {
			console.error('WP member sync failed', error);
			wpSyncStatus = 'failed';
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
		} catch (error) {
			console.error('Relay sync failed', error);
			relaySyncStatus = 'failed';
		}
	});

	function statusLabel(status: string): string {
		if (status === 'pending') return 'pending';
		if (status === 'confirmed') return 'confirmed';
		if (status === 'failed') return 'failed';
		return '';
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
			return;
		}

		newThreadTitle = '';
		newThreadContent = '';
		threadSubmitStatus =
			result.status === 'confirmed'
				? 'Thread erstellt und bestaetigt.'
				: 'Thread lokal erstellt, Relay-Publish fehlgeschlagen (Retry verfuegbar).';
	}
</script>

<svelte:head>
	<title>Forum {data.forumId}</title>
</svelte:head>

<h1>Forum: {data.forumId}</h1>

{#if $communityStore}
	<p>
		Mitglieder: {$communityStore.generalMemberCount} |
		Moderatoren: {$communityStore.moderatorCount}
	</p>
{/if}

{#if $syncStateStore.lastSyncAt}
	<p>Letzter Sync: {new Date($syncStateStore.lastSyncAt).toLocaleString()}</p>
{/if}
{#if wpSyncStatus === 'synced'}
	<p>WP-Mitglieder synchronisiert: {importedWpUsers}</p>
{:else if wpSyncStatus === 'failed'}
	<p>WP-Mitgliedersync fehlgeschlagen.</p>
{/if}
{#if relaySyncStatus === 'synced'}
	<p>Relay-Sync erfolgreich: {relayFetchedEvents} Events geladen.</p>
{:else if relaySyncStatus === 'failed'}
	<p>Relay-Sync fehlgeschlagen.</p>
{/if}

<h2>Neuer Thread</h2>
<form onsubmit={submitThread}>
	<label>
		Titel (optional)
		<input type="text" bind:value={newThreadTitle} maxlength="120" />
	</label>
	<label>
		Text
		<textarea bind:value={newThreadContent} rows="4" required></textarea>
	</label>
	<button type="submit" disabled={threadSubmitting}>
		{threadSubmitting ? 'Speichert...' : 'Thread erstellen'}
	</button>
</form>
{#if threadSubmitStatus}
	<p>{threadSubmitStatus}</p>
{/if}

<h2>Threads</h2>
{#if $threadListStore.length === 0}
	<p>Keine Threads vorhanden.</p>
{:else}
	<ul>
		{#each $threadListStore as thread}
			<li>
				<a href={`/forums/${thread.community}/${thread.rootId}`}>{thread.title}</a>
				<small>
					by {thread.author} | replies {thread.replyCount}
				</small>
				{#if $writeStatusStore[thread.rootId]}
					<small class={`write-status status-${$writeStatusStore[thread.rootId]}`}>
						{statusLabel($writeStatusStore[thread.rootId])}
					</small>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	form {
		display: grid;
		gap: 0.6rem;
		max-width: 38rem;
		margin-bottom: 1rem;
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

	.write-status {
		margin-left: 0.5rem;
		font-weight: 600;
	}

	.status-pending {
		color: #856404;
	}

	.status-confirmed {
		color: #155724;
	}

	.status-failed {
		color: #721c24;
	}
</style>
