<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createBrowserNip07Signer,
		createSimplePoolPublisher,
		createWriteFlowService
	} from '$lib/actions';
	import { createThreadRouteStores } from '$lib/routes/contracts';
	import { DEFAULT_ROUTE_USER_PUBKEY } from '$lib/routes/contracts';
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
	let reactionValue = $state(':heart:');
	let reportReason = $state('');
	let actionStatus = $state('');
	let actionBusy = $state(false);

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

	const isFocused = (eventId: string): boolean => postId !== null && postId === eventId;

	function pendingForTarget(targetId: string) {
		return $pendingWritesStore
			.filter((row) => row.targetId === targetId)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	async function sendReaction(targetId: string): Promise<void> {
		actionBusy = true;
		actionStatus = '';
		const result = await writeService.createReaction({
			community: forumId,
			authorPubkey: DEFAULT_ROUTE_USER_PUBKEY,
			relays: [relayUrl],
			targetId,
			value: reactionValue
		});
		actionBusy = false;

		if (!result.ok) {
			actionStatus = `Reaktion fehlgeschlagen: ${result.message}`;
			return;
		}

		actionStatus =
			result.status === 'confirmed'
				? 'Reaktion bestaetigt.'
				: 'Reaktion lokal gespeichert, Relay-Publish fehlgeschlagen.';
	}

	async function sendReport(targetId: string): Promise<void> {
		actionBusy = true;
		actionStatus = '';
		const result = await writeService.createReport({
			community: forumId,
			authorPubkey: DEFAULT_ROUTE_USER_PUBKEY,
			relays: [relayUrl],
			targetId,
			reason: reportReason
		});
		actionBusy = false;

		if (!result.ok) {
			actionStatus = `Report fehlgeschlagen: ${result.message}`;
			return;
		}

		reportReason = '';
		actionStatus =
			result.status === 'confirmed'
				? 'Report bestaetigt.'
				: 'Report lokal gespeichert, Relay-Publish fehlgeschlagen.';
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
	<label>
		Reaktion/Vote
		<input bind:value={reactionValue} maxlength="24" />
	</label>
	<button onclick={() => $threadStore.root && sendReaction($threadStore.root.id)} disabled={actionBusy}>
		Reaktion senden
	</button>

	{#if $threadStore.reactionsByTarget[$threadStore.root.id]}
		<ul>
			{#each Object.entries($threadStore.reactionsByTarget[$threadStore.root.id]) as [value, count]}
				<li>{value}: {count}</li>
			{/each}
		</ul>
	{:else}
		<p>Keine Reaktionen.</p>
	{/if}

	<h3>Report</h3>
	<label>
		Grund (optional)
		<input bind:value={reportReason} maxlength="120" />
	</label>
	<button onclick={() => $threadStore.root && sendReport($threadStore.root.id)} disabled={actionBusy}>
		Report senden
	</button>

	{#if pendingForTarget($threadStore.root.id).length > 0}
		<p>Write-Status:</p>
		<ul>
			{#each pendingForTarget($threadStore.root.id) as pending}
				<li>{pending.action}: {pending.status} (attempts: {pending.attemptCount})</li>
			{/each}
		</ul>
	{/if}

	{#if actionStatus}
		<p>{actionStatus}</p>
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
	label {
		display: block;
		margin: 0.35rem 0;
	}

	input {
		font: inherit;
		padding: 0.35rem 0.45rem;
		margin-left: 0.35rem;
	}

	button {
		margin: 0.25rem 0 0.75rem;
	}

	.selected {
		outline: 2px solid #1f7a8c;
		padding: 0.15rem 0.3rem;
		border-radius: 0.25rem;
		background: #eef8fa;
	}
</style>
