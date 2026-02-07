<script lang="ts">
	import { onMount } from 'svelte';
	import { ensureDemoData } from '$lib/data/db';
	import { createCommunityStore, createSyncStateStore, createThreadListStore } from '$lib/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let communityStore = $state(createCommunityStore(''));
	let threadListStore = $state(createThreadListStore('', 'general'));
	let syncStateStore = $state(createSyncStateStore(''));

	$effect(() => {
		communityStore = createCommunityStore(data.forumId);
		threadListStore = createThreadListStore(data.forumId, 'general');
		syncStateStore = createSyncStateStore(data.forumId);
	});

	onMount(async () => {
		await ensureDemoData(data.forumId);
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

<h2>Threads</h2>
{#if $threadListStore.length === 0}
	<p>Keine Threads vorhanden.</p>
{:else}
	<ul>
		{#each $threadListStore as thread}
			<li>
				<a href={`/forums/${thread.community}/${thread.rootId}`}>{thread.title}</a>
				<small>
					by {thread.author} · replies {thread.replyCount}
				</small>
			</li>
		{/each}
	</ul>
{/if}
