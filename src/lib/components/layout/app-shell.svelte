<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import {
		Clock3,
		House,
		LayoutList,
		MessageSquare,
		PanelLeft,
		PanelRight,
		RefreshCw,
		Send,
		Shield,
		Users,
		Wifi,
		WifiOff
	} from '@lucide/svelte';
	import { ThemeToggle } from '$lib/components/ui';
	import {
		createCommunityStore,
		createPendingWritesStore,
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
			isForumRoute: Boolean(parts[1]),
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

	let previousViewport: ShellViewport | null = null;
	let previousIsForumRoute: boolean | null = null;

	let syncStateStore = $state(createSyncStateStore(''));
	let pendingWritesStore = $state(createPendingWritesStore(''));
	let communityStore = $state(createCommunityStore(''));

	const iconSize = 16;
	const pendingCount = $derived($pendingWritesStore.filter((row) => row.status === 'pending').length);
	const failedCount = $derived($pendingWritesStore.filter((row) => row.status === 'failed').length);
	const relayCount = $derived($syncStateStore.relays.length);
	const hasRelaySync = $derived(relayCount > 0);
	const lastSyncLabel = $derived(
		$syncStateStore.lastSyncAt ? new Date($syncStateStore.lastSyncAt).toLocaleString() : 'n/a'
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
			return;
		}

		syncStateStore = createSyncStateStore(forumContext.communityId);
		pendingWritesStore = createPendingWritesStore(forumContext.communityId);
		communityStore = createCommunityStore(forumContext.communityId);
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
		return () => {
			window.removeEventListener('resize', updateViewportFromWindow);
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

{#snippet rightSidebarContent()}
	<div class="shell-panel-head">
		<h2>Community Kontext</h2>
		<p>Mitglieder, Sync und Route-Meta</p>
	</div>

	{#if $communityStore}
		<ul class="shell-stats-list">
			<li>
				<Users size={iconSize} />
				<span>General Members</span>
				<strong>{$communityStore.generalMemberCount}</strong>
			</li>
			<li>
				<Shield size={iconSize} />
				<span>Moderators</span>
				<strong>{$communityStore.moderatorCount}</strong>
			</li>
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

<div class="app-frame">
	<header class="app-topbar">
		<div class="app-topbar-cluster">
			<button
				type="button"
				class="ui-button"
				aria-label="Toggle navigation sidebar"
				onclick={() => togglePanel('left')}
				disabled={!forumContext.isForumRoute}
			>
				<PanelLeft size={iconSize} />
			</button>
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
			<span class="shell-sync-pill">
				{#if hasRelaySync}
					<Wifi size={iconSize} />
				{:else}
					<WifiOff size={iconSize} />
				{/if}
				{#if hasRelaySync}
					relay synced
				{:else}
					no relay state
				{/if}
			</span>

			{#if forumContext.communityId}
				<a class="ui-button ui-button-primary" href={`/forums/${forumContext.communityId}#new-thread`}>
					<Send size={iconSize} />
					<span>New Thread</span>
				</a>
			{/if}

			<ThemeToggle />

			<button
				type="button"
				class="ui-button"
				aria-label="Toggle context sidebar"
				onclick={() => togglePanel('right')}
				disabled={!forumContext.isForumRoute}
			>
				<PanelRight size={iconSize} />
			</button>
		</div>
	</header>

	<div class="shell-layout">
		{#if forumContext.isForumRoute && panels.leftOpen && viewport === 'desktop'}
			<aside class="shell-sidebar shell-sidebar-left" aria-label="Forum navigation panel">
				{@render leftSidebarContent()}
			</aside>
		{/if}

		<main class="app-content">
			{@render children()}
		</main>

		{#if forumContext.isForumRoute && panels.rightOpen && viewport === 'desktop'}
			<aside class="shell-sidebar shell-sidebar-right" aria-label="Forum context panel">
				{@render rightSidebarContent()}
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
