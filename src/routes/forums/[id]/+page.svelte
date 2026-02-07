<script lang="ts">
	import { onMount } from 'svelte';
	import { ensureDemoData } from '$lib/data/db';
	import { syncGeneralListFromWpEndpoint } from '$lib/provisioning/wpMembers';
	import { createForumRouteStores } from '$lib/routes/contracts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let communityStore = $state(createForumRouteStores('').communityStore);
	let threadListStore = $state(createForumRouteStores('').threadListStore);
	let syncStateStore = $state(createForumRouteStores('').syncStateStore);
	let wpSyncStatus = $state<'idle' | 'synced' | 'failed'>('idle');
	let importedWpUsers = $state(0);

	$effect(() => {
		const stores = createForumRouteStores(data.forumId);
		communityStore = stores.communityStore;
		threadListStore = stores.threadListStore;
		syncStateStore = stores.syncStateStore;
	});

	onMount(async () => {
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
	});
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
			</li>
		{/each}
	</ul>
{/if}
