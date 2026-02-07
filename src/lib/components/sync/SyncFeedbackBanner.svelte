<script lang="ts">
	import type { SyncFeedbackView } from '$lib/routes/syncFeedback';

	let {
		view,
		compact = false,
		showRetry = false,
		retryBusy = false,
		retryLabel = 'Retry sync',
		onRetry
	}: {
		view: SyncFeedbackView;
		compact?: boolean;
		showRetry?: boolean;
		retryBusy?: boolean;
		retryLabel?: string;
		onRetry?: () => Promise<void> | void;
	} = $props();
</script>

<div class={`sync-feedback sync-feedback-${view.level} ${compact ? 'sync-feedback-compact' : ''}`}>
	<div>
		<strong>{view.label}</strong>
		{#if !compact}
			<p>{view.description}</p>
		{/if}
	</div>
	{#if showRetry && onRetry}
		<button type="button" class="ui-button sync-feedback-retry" disabled={retryBusy} onclick={onRetry}>
			{retryBusy ? 'Syncing...' : retryLabel}
		</button>
	{/if}
</div>

<style>
	.sync-feedback {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.45rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.84rem;
	}

	.sync-feedback strong {
		text-transform: lowercase;
		font-size: 0.82rem;
		letter-spacing: 0.01em;
	}

	.sync-feedback p {
		margin: 0.15rem 0 0;
		color: var(--muted-foreground);
		font-size: 0.8rem;
	}

	.sync-feedback-compact {
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
	}

	.sync-feedback-compact p {
		display: none;
	}

	.sync-feedback-retry {
		white-space: nowrap;
	}

	.sync-feedback-healthy {
		background: color-mix(in oklab, var(--chart-1) 10%, transparent);
	}

	.sync-feedback-syncing {
		background: color-mix(in oklab, var(--chart-2) 12%, transparent);
	}

	.sync-feedback-stale {
		background: color-mix(in oklab, var(--chart-2) 10%, transparent);
	}

	.sync-feedback-partial {
		background: color-mix(in oklab, var(--accent) 14%, transparent);
	}

	.sync-feedback-failed {
		background: color-mix(in oklab, var(--destructive) 10%, transparent);
	}
</style>
