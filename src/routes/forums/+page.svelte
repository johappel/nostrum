<script lang="ts">
	import { onMount } from 'svelte';
	import { ensureDemoData } from '$lib/data/db';
	import { validateCommunityId } from '$lib/routes/forumsHub';
	import { notifyError, notifySuccess } from '$lib/components/ui';
	import { createForumHubStore } from '$lib/stores';

	const forumHubStore = createForumHubStore();

	let newForumId = $state('');
	let creating = $state(false);
	let createStatus = $state('');

	const existingForumIds = $derived($forumHubStore.map((item) => item.community));

	onMount(() => {
		void ensureDemoData('demo');
	});

	async function createForum(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		createStatus = '';

		const validated = validateCommunityId(newForumId, existingForumIds);
		if (!validated.ok) {
			createStatus = validated.message;
			return;
		}

		creating = true;
		try {
			await ensureDemoData(validated.community);
			newForumId = '';
			createStatus = `Forum \`${validated.community}\` wurde erstellt.`;
			notifySuccess('Forum erstellt', validated.community);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			createStatus = `Forum konnte nicht erstellt werden: ${message}`;
			notifyError('Forum konnte nicht erstellt werden', message);
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>Forums</title>
</svelte:head>

<section class="forums-hub">
	<header class="forums-head">
		<div>
			<h1>Forums</h1>
			<p>Startpunkte fuer Communities.</p>
		</div>
		<div class="forums-actions">
			<a class="ui-button" href="#new-forum">Forum erstellen</a>
		</div>
	</header>

	<section class="forums-list">
		<h2>Verfuegbare Foren</h2>
		{#if $forumHubStore.length === 0}
			<div class="empty-state">
				<p>Keine Foren im lokalen Cache. Erstelle ein Forum, um zu starten.</p>
			</div>
		{:else}
			<ul>
				{#each $forumHubStore as forum}
					<li>
						<article class="forum-card">
							<header>
								<a href={`/forums/${forum.community}`}>{forum.community}</a>
							</header>
							<p>
								Threads {forum.threadCount} | Members {forum.generalMemberCount} | Moderators {forum.moderatorCount}
							</p>
						</article>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="composer-card" id="new-forum">
		<div class="composer-head">
			<h2>Neues Forum erstellen</h2>
		</div>
		<form onsubmit={createForum}>
			<label>
				Forum-ID (z. B. `nostr-dev`)
				<input type="text" bind:value={newForumId} maxlength="64" placeholder="forum-id" required />
			</label>
			<div class="composer-actions">
				<button type="submit" class="ui-button ui-button-primary" disabled={creating}>
					{creating ? 'Erstellt...' : 'Forum anlegen'}
				</button>
				{#if createStatus}
					<p>{createStatus}</p>
				{/if}
			</div>
		</form>
	</section>
</section>

<style>
	.forums-hub {
		display: grid;
		gap: 1rem;
	}

	.forums-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.forums-head h1 {
		margin: 0;
		font-size: 1.2rem;
	}

	.forums-head p {
		margin: 0.25rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.92rem;
	}

	.forums-actions {
		display: inline-flex;
	}

	.forums-list h2 {
		margin: 0 0 0.5rem;
		font-size: 1.02rem;
	}

	.forums-list ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.55rem;
	}

	.forum-card {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.7rem 0.75rem;
		background: color-mix(in oklab, var(--card) 92%, transparent);
	}

	.forum-card header a {
		text-decoration: none;
		font-weight: 600;
	}

	.forum-card p {
		margin: 0.35rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.86rem;
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

	.empty-state {
		border: 1px dashed var(--border);
		border-radius: var(--radius);
		padding: 0.9rem;
		color: var(--muted-foreground);
		font-size: 0.9rem;
	}
</style>
