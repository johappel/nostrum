import { describe, expect, it } from 'vitest';
import { normalizeThemeMode, resolveEffectiveTheme } from '../src/lib/stores/theme';

describe('theme mode contract', () => {
	it('normalizes unknown values to auto', () => {
		expect(normalizeThemeMode(undefined)).toBe('auto');
		expect(normalizeThemeMode(null)).toBe('auto');
		expect(normalizeThemeMode('unexpected')).toBe('auto');
	});

	it('keeps valid mode values', () => {
		expect(normalizeThemeMode('auto')).toBe('auto');
		expect(normalizeThemeMode('light')).toBe('light');
		expect(normalizeThemeMode('dark')).toBe('dark');
	});

	it('resolves effective mode deterministically for auto', () => {
		expect(resolveEffectiveTheme('auto', true)).toBe('dark');
		expect(resolveEffectiveTheme('auto', false)).toBe('light');
	});

	it('resolves fixed modes independent from system preference', () => {
		expect(resolveEffectiveTheme('light', true)).toBe('light');
		expect(resolveEffectiveTheme('dark', false)).toBe('dark');
	});
});
