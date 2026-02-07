<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import { themeMode } from '$lib/stores/theme';

	const sonnerTheme = $derived($themeMode === 'auto' ? 'system' : $themeMode);
</script>

<Toaster
	position="top-right"
	theme={sonnerTheme}
	richColors={true}
	expand={false}
	closeButton={true}
	toastOptions={{
		class: 'ui-sonner-toast'
	}}
/>
