<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { AppShell } from '$lib/components/layout';
	import { Toaster } from '$lib/components/ui';
	import { initThemeMode } from '$lib/stores';

	let { children } = $props();

	onMount(() => {
		initThemeMode();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppShell pathname={page.url.pathname}>
	{@render children()}
</AppShell>

<Toaster />
