import { get, writable } from 'svelte/store';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type EffectiveTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'nostrum-theme-mode';

const modeStore = writable<ThemeMode>('auto');
const effectiveStore = writable<EffectiveTheme>('light');

let initialized = false;
let mediaQueryCleanup: (() => void) | null = null;

function isBrowserRuntime(): boolean {
	return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function normalizeThemeMode(value: unknown): ThemeMode {
	if (value === 'light' || value === 'dark' || value === 'auto') {
		return value;
	}
	return 'auto';
}

export function resolveEffectiveTheme(mode: ThemeMode, prefersDark: boolean): EffectiveTheme {
	if (mode === 'auto') return prefersDark ? 'dark' : 'light';
	return mode;
}

function getSystemPrefersDark(): boolean {
	if (!isBrowserRuntime() || !window.matchMedia) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredThemeMode(): ThemeMode {
	if (!isBrowserRuntime()) return 'auto';
	try {
		return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
	} catch {
		return 'auto';
	}
}

function writeStoredThemeMode(mode: ThemeMode): void {
	if (!isBrowserRuntime()) return;
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		// Ignore storage write errors (private mode, quota, etc.).
	}
}

function applyThemeMode(mode: ThemeMode): void {
	if (!isBrowserRuntime()) return;
	const effective = resolveEffectiveTheme(mode, getSystemPrefersDark());
	const root = document.documentElement;
	root.classList.toggle('dark', effective === 'dark');
	root.dataset.themeMode = mode;
	root.dataset.theme = effective;

	modeStore.set(mode);
	effectiveStore.set(effective);
}

function registerSystemThemeListener(): void {
	if (!isBrowserRuntime() || !window.matchMedia) return;
	if (mediaQueryCleanup) return;

	const query = window.matchMedia('(prefers-color-scheme: dark)');
	const handler = () => {
		const current = get(modeStore);
		if (current === 'auto') applyThemeMode('auto');
	};

	query.addEventListener('change', handler);
	mediaQueryCleanup = () => {
		query.removeEventListener('change', handler);
		mediaQueryCleanup = null;
	};
}

export function initThemeMode(): void {
	if (initialized) return;
	initialized = true;
	const mode = readStoredThemeMode();
	applyThemeMode(mode);
	registerSystemThemeListener();
}

export function setThemeMode(mode: ThemeMode): void {
	const normalized = normalizeThemeMode(mode);
	writeStoredThemeMode(normalized);
	applyThemeMode(normalized);
}

export function toggleThemeMode(): void {
	let current: ThemeMode = 'auto';
	modeStore.subscribe((value) => {
		current = value;
	})();

	const next: ThemeMode =
		current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
	setThemeMode(next);
}

export function destroyThemeModeListenerForTests(): void {
	mediaQueryCleanup?.();
	initialized = false;
}

export const themeMode = {
	subscribe: modeStore.subscribe
};

export const effectiveTheme = {
	subscribe: effectiveStore.subscribe
};
