<script lang="ts">
  import { page } from '$app/state';

  const forumId = page.params.id;
  const threadId = page.params.thread_id;
</script>

<svelte:head>
  <title>Thread {threadId} in Forum {forumId}</title>
</svelte:head>

<h1>Forum: {forumId}</h1>
<h2>Thread: {threadId}</h2>
<p>Thread-Detailseite.</p>
