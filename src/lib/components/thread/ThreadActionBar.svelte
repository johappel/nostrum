<script lang="ts">
	export interface ThreadActionBarCounts {
		pending: number;
		failed: number;
		confirmed: number;
	}

	let {
		targetId,
		reactions = {},
		counts = { pending: 0, failed: 0, confirmed: 0 },
		canReact,
		canModerate,
		busy = false,
		onReact,
		onReport
	}: {
		targetId: string;
		reactions?: Record<string, number>;
		counts?: ThreadActionBarCounts;
		canReact: boolean;
		canModerate: boolean;
		busy?: boolean;
		onReact: (input: { targetId: string; value: string }) => Promise<void> | void;
		onReport: (input: { targetId: string; reason: string }) => Promise<void> | void;
	} = $props();

	let reactionValue = $state(':heart:');
	let reportReason = $state('');

	function quickReaction(value: string): void {
		reactionValue = value;
	}

	async function sendReaction(): Promise<void> {
		const value = reactionValue.trim();
		if (!value) return;
		await onReact({ targetId, value });
	}

	async function sendReport(): Promise<void> {
		await onReport({ targetId, reason: reportReason.trim() });
		reportReason = '';
	}
</script>

<section class="thread-action-bar">
	<div class="thread-action-row">
		<div class="quick-reactions">
			<button type="button" class="ui-button" onclick={() => quickReaction(':heart:')}>:heart:</button>
			<button type="button" class="ui-button" onclick={() => quickReaction('+')}>+</button>
			<button type="button" class="ui-button" onclick={() => quickReaction('-')}>-</button>
		</div>
		<div class="action-counts">
			{#if counts.pending > 0}
				<span class="status-pill status-pill-pending">pending {counts.pending}</span>
			{/if}
			{#if counts.failed > 0}
				<span class="status-pill status-pill-failed">failed {counts.failed}</span>
			{/if}
			{#if counts.confirmed > 0}
				<span class="status-pill status-pill-confirmed">confirmed {counts.confirmed}</span>
			{/if}
		</div>
	</div>

	<div class="thread-action-row">
		<label>
			Reaction/Vote
			<input bind:value={reactionValue} maxlength="24" />
		</label>
		<button class="ui-button" type="button" disabled={!canReact || busy} onclick={sendReaction}>
			Reaktion senden
		</button>
	</div>

	<div class="thread-action-row">
		<label>
			Report reason
			<input bind:value={reportReason} maxlength="120" />
		</label>
		<button class="ui-button" type="button" disabled={!canModerate || busy} onclick={sendReport}>
			Report senden
		</button>
	</div>

	{#if Object.keys(reactions).length > 0}
		<ul class="reaction-summary">
			{#each Object.entries(reactions) as [value, count]}
				<li>{value}: {count}</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.thread-action-bar {
		border: 1px dashed var(--border);
		border-radius: var(--radius);
		padding: 0.65rem;
		display: grid;
		gap: 0.5rem;
		background: color-mix(in oklab, var(--muted) 45%, transparent);
	}

	.thread-action-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.quick-reactions {
		display: inline-flex;
		gap: 0.35rem;
	}

	label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	input {
		font: inherit;
		padding: 0.35rem 0.45rem;
	}

	.action-counts {
		display: inline-flex;
		gap: 0.35rem;
	}

	.reaction-summary {
		margin: 0;
		padding-left: 1rem;
		font-size: 0.86rem;
		color: var(--muted-foreground);
	}
</style>
