<script lang="ts">
	import { Laptop, Moon, Sun } from '@lucide/svelte';
	import { setThemeMode, themeMode, type ThemeMode } from '$lib/stores/theme';

	const iconSize = 16;

	function onModeChange(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;
		setThemeMode(select.value as ThemeMode);
	}
</script>

<label class="theme-toggle" aria-label="Theme mode">
	{#if $themeMode === 'light'}
		<Sun size={iconSize} />
	{:else if $themeMode === 'dark'}
		<Moon size={iconSize} />
	{:else}
		<Laptop size={iconSize} />
	{/if}
	<select value={$themeMode} onchange={onModeChange}>
		<option value="auto">Auto</option>
		<option value="light">Light</option>
		<option value="dark">Dark</option>
	</select>
</label>
