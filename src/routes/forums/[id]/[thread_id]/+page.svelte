<script lang="ts">
	import { onMount } from 'svelte';
	import { ensureDemoData } from '$lib/data/db';
	import { createThreadRouteStores } from '$lib/routes/contracts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let threadStore = $state(createThreadRouteStores('', '').threadStore);
	let permissionsStore = $state(createThreadRouteStores('', '').permissionsStore);

	$effect(() => {
		const stores = createThreadRouteStores(data.forumId, data.threadId);
		threadStore = stores.threadStore;
		permissionsStore = stores.permissionsStore;
	});

	onMount(async () => {
		await ensureDemoData(data.forumId);
	});
</script>

<svelte:head>
	<title>Thread {data.threadId} in Forum {data.forumId}</title>
</svelte:head>

<p><a href={`/forums/${data.forumId}`}>Zurueck zum Forum</a></p>
<h1>Forum: {data.forumId}</h1>

{#if !$threadStore.root}
	<p>Thread nicht gefunden.</p>
{:else}
	<h2>{$threadStore.root.content}</h2>
	<p>Autor: {$threadStore.root.pubkey}</p>
	<p>
		Berechtigungen:
		post={$permissionsStore.canPost ? 'yes' : 'no'},
		react={$permissionsStore.canReact ? 'yes' : 'no'},
		moderate={$permissionsStore.canModerate ? 'yes' : 'no'}
	</p>

	<h3>Reaktionen</h3>
	{#if $threadStore.reactionsByTarget[$threadStore.root.id]}
		<ul>
			{#each Object.entries($threadStore.reactionsByTarget[$threadStore.root.id]) as [value, count]}
				<li>{value}: {count}</li>
			{/each}
		</ul>
	{:else}
		<p>Keine Reaktionen.</p>
	{/if}

	<h3>Antworten ({$threadStore.replies.length})</h3>
	{#if $threadStore.replies.length === 0}
		<p>Keine Antworten.</p>
	{:else}
		<ul>
			{#each $threadStore.replies as reply}
				<li>{reply.content} <small>({reply.pubkey})</small></li>
			{/each}
		</ul>
	{/if}
{/if}
