<script lang="ts">
	import { createThreadRouteStores } from '$lib/routes/contracts';
	import { ensureDemoData } from '$lib/data/db';

	let {
		forumId,
		threadId,
		postId = null
	}: {
		forumId: string;
		threadId: string;
		postId?: string | null;
	} = $props();

	let threadStore = $state(createThreadRouteStores('', '').threadStore);
	let permissionsStore = $state(createThreadRouteStores('', '').permissionsStore);

	$effect(() => {
		const stores = createThreadRouteStores(forumId, threadId);
		threadStore = stores.threadStore;
		permissionsStore = stores.permissionsStore;
	});

	$effect(() => {
		void ensureDemoData(forumId);
	});

	const isFocused = (eventId: string): boolean => postId !== null && postId === eventId;
</script>

<svelte:head>
	<title>Thread {threadId} in Forum {forumId}</title>
</svelte:head>

<p><a href={`/forums/${forumId}`}>Zurueck zum Forum</a></p>
<h1>Forum: {forumId}</h1>

{#if !$threadStore.root}
	<p>Thread nicht gefunden.</p>
{:else}
	<h2 class:selected={isFocused($threadStore.root.id)} id={$threadStore.root.id}>
		{$threadStore.root.content}
	</h2>
	<p>Autor: {$threadStore.root.pubkey}</p>
	{#if postId !== null && !isFocused($threadStore.root.id) && !$threadStore.replies.some((r) => r.id === postId)}
		<p>Hinweis: Beitrag `{postId}` nicht gefunden.</p>
	{/if}
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
				<li class:selected={isFocused(reply.id)} id={reply.id}>
					<a href={`/forums/${forumId}/${threadId}/${reply.id}`}>{reply.content}</a>
					<small>({reply.pubkey})</small>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.selected {
		outline: 2px solid #1f7a8c;
		padding: 0.15rem 0.3rem;
		border-radius: 0.25rem;
		background: #eef8fa;
	}
</style>

