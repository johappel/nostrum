<script lang="ts">
	import ThreadDetailView from '$lib/components/ThreadDetailView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ThreadDetailView forumId={data.forumId} threadId={data.threadId} postId={data.postId} />

