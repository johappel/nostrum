<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import {
		CircleAlert,
		Clock3,
		EyeOff,
		House,
		LayoutList,
		MessageSquare,
		MoveRight,
		PanelLeftClose,
		PanelLeftOpen,
		PanelRightClose,
		PanelRightOpen,
		RefreshCw,
		Send,
		Shield,
		Users
	} from '@lucide/svelte';
	import SyncFeedbackBanner from '$lib/components/sync/SyncFeedbackBanner.svelte';
	import { DEFAULT_ROUTE_USER_PUBKEY } from '$lib/routes/contracts';
	import {
		buildMemberPanelView,
		buildModerationPanelView,
		buildModerationQueue
	} from '$lib/routes/moderationPanels';
	import { ThemeToggle } from '$lib/components/ui';
	import { summarizeSyncFeedback } from '$lib/routes/syncFeedback';
	import {
		createCommunityStore,
		createModerationLabelsStore,
		createPendingWritesStore,
		createPermissionsStore,
		createSyncStateStore
	} from '$lib/stores';
	import {
		getDefaultShellPanelsState,
		resolveShellViewport,
		syncShellPanelsToContext,
		toggleShellPanel,
		type ShellPanelsState,
		type ShellSide,
		type ShellViewport
	} from './shellState';

	let { pathname, children }: { pathname: string; children: Snippet } = $props();

	interface ForumRouteContext {
		isForumRoute: boolean;
		communityId: string | null;
		threadId: string | null;
		postId: string | null;
	}

	function deriveForumRouteContext(path: string): ForumRouteContext {
		const parts = path.split('/').filter((part) => part.length > 0);
		if (parts[0] !== 'forums') {
			return {
				isForumRoute: false,
				communityId: null,
				threadId: null,
				postId: null
			};
		}

		return {
			isForumRoute: true,
			communityId: parts[1] ?? null,
			threadId: parts[2] ?? null,
			postId: parts[3] ?? null
		};
	}

	const forumContext = $derived(deriveForumRouteContext(pathname));

	let viewport = $state<ShellViewport>('desktop');
	let panels = $state<ShellPanelsState>(
		getDefaultShellPanelsState('desktop', { isForumRoute: false })
	);
	let nowMs = $state(Date.now());

	let previousViewport: ShellViewport | null = null;
	let previousIsForumRoute: boolean | null = null;

	let syncStateStore = $state(createSyncStateStore(''));
	let pendingWritesStore = $state(createPendingWritesStore(''));
	let communityStore = $state(createCommunityStore(''));
	let permissionsStore = $state(createPermissionsStore(DEFAULT_ROUTE_USER_PUBKEY, ''));
	let moderationLabelsStore = $state(createModerationLabelsStore(''));

	const iconSize = 16;
	const compactIconSize = 17;
	const pendingCount = $derived($pendingWritesStore.filter((row) => row.status === 'pending').length);
	const failedCount = $derived($pendingWritesStore.filter((row) => row.status === 'failed').length);
	const relayCount = $derived($syncStateStore.relays.length);
	const canModerate = $derived($permissionsStore.canModerate);
	const memberPanelView = $derived(
		buildMemberPanelView({
			generalMembers: $communityStore?.generalMembers ?? [],
			moderatorMembers: $communityStore?.moderatorMembers ?? []
		})
	);
	const moderationQueue = $derived(buildModerationQueue($moderationLabelsStore));
	const moderationPanelView = $derived(buildModerationPanelView(canModerate, moderationQueue));
	const syncFeedback = $derived(
		summarizeSyncFeedback({
			syncState: $syncStateStore,
			nowMs
		})
	);
	const lastSyncLabel = $derived(
		$syncStateStore.lastSyncAt ? new Date($syncStateStore.lastSyncAt).toLocaleString() : 'n/a'
	);
	const shellLeftWidth = $derived(
		forumContext.isForumRoute && viewport === 'desktop' ? (panels.leftOpen ? '250px' : '56px') : '0px'
	);
	const shellRightWidth = $derived(
		forumContext.isForumRoute && viewport === 'desktop' ? (panels.rightOpen ? '280px' : '56px') : '0px'
	);

	$effect(() => {
		const next = syncShellPanelsToContext(panels, {
			viewport,
			context: { isForumRoute: forumContext.isForumRoute },
			previousViewport,
			previousIsForumRoute
		});

		const changed =
			next.leftOpen !== panels.leftOpen || next.rightOpen !== panels.rightOpen;
		if (changed) {
			panels = next;
		}

		previousViewport = viewport;
		previousIsForumRoute = forumContext.isForumRoute;
	});

	$effect(() => {
		if (!forumContext.communityId) {
			syncStateStore = createSyncStateStore('');
			pendingWritesStore = createPendingWritesStore('');
			communityStore = createCommunityStore('');
			permissionsStore = createPermissionsStore(DEFAULT_ROUTE_USER_PUBKEY, '');
			moderationLabelsStore = createModerationLabelsStore('');
			return;
		}

		syncStateStore = createSyncStateStore(forumContext.communityId);
		pendingWritesStore = createPendingWritesStore(forumContext.communityId);
		communityStore = createCommunityStore(forumContext.communityId);
		permissionsStore = createPermissionsStore(DEFAULT_ROUTE_USER_PUBKEY, forumContext.communityId);
		moderationLabelsStore = createModerationLabelsStore(forumContext.communityId);
	});

	function updateViewportFromWindow(): void {
		if (typeof window === 'undefined') return;
		viewport = resolveShellViewport(window.innerWidth);
	}

	function togglePanel(side: ShellSide): void {
		panels = toggleShellPanel(
			panels,
			side,
			viewport,
			{ isForumRoute: forumContext.isForumRoute }
		);
	}

	function closePanels(): void {
		panels = {
			leftOpen: false,
			rightOpen: false
		};
	}

	onMount(() => {
		updateViewportFromWindow();
		window.addEventListener('resize', updateViewportFromWindow);
		const intervalId = window.setInterval(() => {
			nowMs = Date.now();
		}, 30_000);
		return () => {
			window.removeEventListener('resize', updateViewportFromWindow);
			window.clearInterval(intervalId);
		};
	});
</script>

{#snippet leftSidebarContent()}
	<div class="shell-panel-head">
		<h2>Forum Navigation</h2>
		<p>Kontext und schnelle Wechsel</p>
	</div>

	<nav aria-label="Forum sections">
		<ul class="shell-link-list">
			<li>
				<a href="/forums">
					<House size={iconSize} />
					<span>Alle Communities</span>
				</a>
			</li>
			{#if forumContext.communityId}
				<li>
					<a href={`/forums/${forumContext.communityId}`}>
						<LayoutList size={iconSize} />
						<span>Thread Feed</span>
					</a>
				</li>
			{/if}
			{#if forumContext.communityId && forumContext.threadId}
				<li>
					<a href={`/forums/${forumContext.communityId}/${forumContext.threadId}`}>
						<MessageSquare size={iconSize} />
						<span>Aktueller Thread</span>
					</a>
				</li>
			{/if}
		</ul>
	</nav>

	<div class="shell-chip-group">
		<span class="status-pill status-pill-pending">pending {pendingCount}</span>
		<span class="status-pill status-pill-failed">failed {failedCount}</span>
	</div>
{/snippet}

{#snippet leftSidebarCollapsedContent()}
	<nav aria-label="Forum quick links">
		<ul class="shell-mini-links">
			<li>
				<a href="/forums" class="shell-mini-link" title="Alle Communities">
					<House size={compactIconSize} />
					<span class="sr-only">Alle Communities</span>
				</a>
			</li>
			{#if forumContext.communityId}
				<li>
					<a
						href={`/forums/${forumContext.communityId}`}
						class="shell-mini-link"
						title="Thread Feed"
					>
						<LayoutList size={compactIconSize} />
						<span class="sr-only">Thread Feed</span>
					</a>
				</li>
			{/if}
			{#if forumContext.communityId && forumContext.threadId}
				<li>
					<a
						href={`/forums/${forumContext.communityId}/${forumContext.threadId}`}
						class="shell-mini-link"
						title="Aktueller Thread"
					>
						<MessageSquare size={compactIconSize} />
						<span class="sr-only">Aktueller Thread</span>
					</a>
				</li>
			{/if}
		</ul>
	</nav>

	<div class="shell-mini-status">
		<span class="shell-mini-stat shell-mini-stat-pending" title={`pending ${pendingCount}`}>
			{pendingCount}
		</span>
		<span class="shell-mini-stat shell-mini-stat-failed" title={`failed ${failedCount}`}>
			{failedCount}
		</span>
	</div>
{/snippet}

{#snippet rightSidebarContent()}
	<div class="shell-panel-head">
		<h2>Community Kontext</h2>
		<p>Mitglieder, Sync und Route-Meta</p>
	</div>
	<SyncFeedbackBanner view={syncFeedback} />

	{#if !forumContext.communityId}
		<p class="shell-muted">Hub-Ansicht: Community auswaehlen, um Member- und Thread-Kontext zu laden.</p>
		<ul class="shell-stats-list">
			<li>
				<RefreshCw size={iconSize} />
				<span>Relays</span>
				<strong>{relayCount}</strong>
			</li>
			<li>
				<Clock3 size={iconSize} />
				<span>Last Sync</span>
				<strong>{lastSyncLabel}</strong>
			</li>
		</ul>
	{:else if $communityStore}
		<section class="shell-panel-section" aria-label="Member panel">
			<div class="shell-panel-section-head">
				<h3>
					<Users size={iconSize} />
					<span>Member Panel</span>
				</h3>
			</div>
			<div class="shell-member-block">
				<p>General Members <strong>{memberPanelView.generalCount}</strong></p>
				{#if memberPanelView.generalCount === 0}
					<p class="shell-muted">Keine General-Member im Cache.</p>
				{:else}
					<ul class="shell-member-list">
						{#each memberPanelView.visibleGeneralMembers as member}
							<li>{member}</li>
						{/each}
					</ul>
					{#if memberPanelView.hiddenGeneralCount > 0}
						<p class="shell-muted">+{memberPanelView.hiddenGeneralCount} weitere</p>
					{/if}
				{/if}
			</div>
			<div class="shell-member-block">
				<p>Moderators <strong>{memberPanelView.moderatorCount}</strong></p>
				{#if memberPanelView.moderatorCount === 0}
					<p class="shell-muted">Keine Moderatorenliste im Cache.</p>
				{:else}
					<ul class="shell-member-list">
						{#each memberPanelView.visibleModeratorMembers as member}
							<li>{member}</li>
						{/each}
					</ul>
					{#if memberPanelView.hiddenModeratorCount > 0}
						<p class="shell-muted">+{memberPanelView.hiddenModeratorCount} weitere</p>
					{/if}
				{/if}
			</div>
		</section>

		<section class="shell-panel-section" aria-label="Moderation panel">
			<div class="shell-panel-section-head">
				<h3>
					<Shield size={iconSize} />
					<span>Moderation Panel</span>
				</h3>
				{#if canModerate}
					<span class="status-pill status-pill-confirmed">can moderate</span>
				{:else}
					<span class="status-pill">read-only</span>
				{/if}
			</div>
			{#if !moderationPanelView.canModerate}
				<p class="shell-muted">Keine Moderationsrechte. Report-Queue nur mit Moderatorrolle sichtbar.</p>
			{:else if moderationPanelView.isEmpty}
				<p class="shell-muted">Report-Queue ist leer.</p>
			{:else}
				<ul class="shell-report-list">
					{#each moderationPanelView.queue as report}
						<li class="shell-report-item">
							<div class="shell-report-head">
								<span>Target: {report.targetId}</span>
								<strong>{report.reportCount} reports</strong>
							</div>
							<p>Labels: {report.labels.join(', ')}</p>
							{#if report.reasons.length > 0}
								<p>Reasons: {report.reasons.join(' | ')}</p>
							{/if}
							<p>Last by {report.latestAuthor} at {new Date(report.latestCreatedAt).toLocaleString()}</p>
							<div class="shell-report-actions">
								<button type="button" class="ui-button" title="Placeholder for Task 013+" disabled>
									<EyeOff size={iconSize} />
									<span>Hide</span>
								</button>
								<button type="button" class="ui-button" title="Placeholder for Task 013+" disabled>
									<MoveRight size={iconSize} />
									<span>Move</span>
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<ul class="shell-stats-list">
			<li>
				<Clock3 size={iconSize} />
				<span>Last Sync</span>
				<strong>{lastSyncLabel}</strong>
			</li>
			<li>
				<RefreshCw size={iconSize} />
				<span>Relays</span>
				<strong>{relayCount}</strong>
			</li>
		</ul>
	{:else}
		<p class="shell-muted">Community-Daten werden geladen.</p>
	{/if}

	<div class="shell-route-meta">
		<p><strong>Route:</strong> {pathname}</p>
		{#if forumContext.postId}
			<p><strong>Focus Post:</strong> {forumContext.postId}</p>
		{/if}
	</div>
{/snippet}

{#snippet rightSidebarCollapsedContent()}
	<ul class="shell-mini-links">
		<li>
			<span class="shell-mini-link" title={`General Members ${$communityStore?.generalMemberCount ?? 0}`}>
				<Users size={compactIconSize} />
				<span class="sr-only">General Members</span>
			</span>
		</li>
		<li>
			<span class="shell-mini-link" title={`Moderators ${$communityStore?.moderatorCount ?? 0}`}>
				<Shield size={compactIconSize} />
				<span class="sr-only">Moderators</span>
			</span>
		</li>
		<li>
			<span class="shell-mini-link" title={`Reports ${moderationPanelView.queue.length}`}>
				<CircleAlert size={compactIconSize} />
				<span class="sr-only">Report Queue</span>
			</span>
		</li>
		<li>
			<span class="shell-mini-link" title={`Relays ${relayCount}`}>
				<RefreshCw size={compactIconSize} />
				<span class="sr-only">Relays</span>
			</span>
		</li>
		<li>
			<span class="shell-mini-link" title={`Last Sync ${lastSyncLabel}`}>
				<Clock3 size={compactIconSize} />
				<span class="sr-only">Last Sync</span>
			</span>
		</li>
	</ul>
{/snippet}

<div class="app-frame">
	<header class="app-topbar">
		<div class="app-topbar-cluster">
			{#if forumContext.isForumRoute && viewport !== 'desktop'}
				<button
					type="button"
					class="ui-button"
					aria-label="Toggle navigation sidebar drawer"
					onclick={() => togglePanel('left')}
				>
					<PanelLeftOpen size={iconSize} />
				</button>
			{/if}
			<a class="app-brand" href="/">
				<span class="app-brand-mark" aria-hidden="true"></span>
				<span>Nostrum</span>
			</a>
		</div>

		<nav class="app-nav" aria-label="Top navigation">
			<a class="app-nav-link" href="/forums">Forums</a>
			{#if forumContext.communityId}
				<a class="app-nav-link" href={`/forums/${forumContext.communityId}`}>
					{forumContext.communityId}
				</a>
			{/if}
		</nav>

		<div class="app-topbar-cluster app-topbar-actions">
			<div class="shell-sync-pill">
				<SyncFeedbackBanner view={syncFeedback} compact />
			</div>

			{#if forumContext.communityId}
				<a class="ui-button ui-button-primary" href={`/forums/${forumContext.communityId}#new-thread`}>
					<Send size={iconSize} />
					<span>New Thread</span>
				</a>
			{/if}

			<ThemeToggle />

			{#if forumContext.isForumRoute && viewport !== 'desktop'}
				<button
					type="button"
					class="ui-button"
					aria-label="Toggle context sidebar drawer"
					onclick={() => togglePanel('right')}
				>
					<PanelRightOpen size={iconSize} />
				</button>
			{/if}
		</div>
	</header>

	<div
		class={`shell-layout ${forumContext.isForumRoute && viewport === 'desktop' ? 'shell-layout-forum-desktop' : ''}`}
		style={`--shell-left-width: ${shellLeftWidth}; --shell-right-width: ${shellRightWidth};`}
	>
		{#if forumContext.isForumRoute && viewport === 'desktop'}
			<aside
				id="shell-left-panel"
				class={`shell-sidebar shell-sidebar-left ${panels.leftOpen ? '' : 'shell-sidebar-collapsed'}`}
				aria-label="Forum navigation panel"
			>
				<button
					type="button"
					class="shell-panel-toggle shell-panel-toggle-left"
					aria-label={panels.leftOpen ? 'Collapse navigation panel' : 'Expand navigation panel'}
					aria-controls="shell-left-panel"
					aria-expanded={panels.leftOpen}
					onclick={() => togglePanel('left')}
				>
					{#if panels.leftOpen}
						<PanelLeftClose size={iconSize} />
					{:else}
						<PanelLeftOpen size={iconSize} />
					{/if}
				</button>

				{#if panels.leftOpen}
					{@render leftSidebarContent()}
				{:else}
					{@render leftSidebarCollapsedContent()}
				{/if}
			</aside>
		{/if}

		<main class="app-content">
			{@render children()}
		</main>

		{#if forumContext.isForumRoute && viewport === 'desktop'}
			<aside
				id="shell-right-panel"
				class={`shell-sidebar shell-sidebar-right ${panels.rightOpen ? '' : 'shell-sidebar-collapsed'}`}
				aria-label="Forum context panel"
			>
				<button
					type="button"
					class="shell-panel-toggle shell-panel-toggle-right"
					aria-label={panels.rightOpen ? 'Collapse context panel' : 'Expand context panel'}
					aria-controls="shell-right-panel"
					aria-expanded={panels.rightOpen}
					onclick={() => togglePanel('right')}
				>
					{#if panels.rightOpen}
						<PanelRightClose size={iconSize} />
					{:else}
						<PanelRightOpen size={iconSize} />
					{/if}
				</button>

				{#if panels.rightOpen}
					{@render rightSidebarContent()}
				{:else}
					{@render rightSidebarCollapsedContent()}
				{/if}
			</aside>
		{/if}
	</div>

	<footer class="app-footer">
		<div class="app-footer-row">
			<span>Local-first forum client on Communikeys</span>
			<span>Last sync: {$syncStateStore.lastSyncAt ? lastSyncLabel : 'n/a'}</span>
			<span>Relays: {relayCount}</span>
		</div>
	</footer>

	{#if forumContext.isForumRoute && viewport !== 'desktop' && (panels.leftOpen || panels.rightOpen)}
		<button
			type="button"
			class="shell-drawer-backdrop"
			aria-label="Close side panels"
			onclick={closePanels}
		></button>
	{/if}

	{#if forumContext.isForumRoute && viewport !== 'desktop' && panels.leftOpen}
		<aside class="shell-drawer shell-drawer-left" aria-label="Forum navigation drawer">
			{@render leftSidebarContent()}
		</aside>
	{/if}

	{#if forumContext.isForumRoute && viewport !== 'desktop' && panels.rightOpen}
		<aside class="shell-drawer shell-drawer-right" aria-label="Forum context drawer">
			{@render rightSidebarContent()}
		</aside>
	{/if}
</div>
