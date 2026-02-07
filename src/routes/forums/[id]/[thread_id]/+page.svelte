<script lang="ts">
	import { env } from '$env/dynamic/public';
	import ThreadDetailView from '$lib/components/ThreadDetailView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const relayUrl = env.PUBLIC_NOSTR_RELAY_URL || 'ws://127.0.0.1:7011';
</script>

<ThreadDetailView forumId={data.forumId} threadId={data.threadId} relayUrl={relayUrl} />
