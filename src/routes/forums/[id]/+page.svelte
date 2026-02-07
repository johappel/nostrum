<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>Forum {page.params.id}</title>
</svelte:head>

<h1>Forum: {page.params.id}</h1>
<p>Thread-Liste fuer dieses Forum.</p>
