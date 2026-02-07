import { describe, expect, it } from 'vitest';
import {
	getDefaultShellPanelsState,
	resolveShellViewport,
	syncShellPanelsToContext,
	toggleShellPanel
} from '../src/lib/components/layout';

describe('app shell panel state', () => {
	it('resolves viewport breakpoints deterministically', () => {
		expect(resolveShellViewport(360)).toBe('mobile');
		expect(resolveShellViewport(900)).toBe('tablet');
		expect(resolveShellViewport(1280)).toBe('desktop');
	});

	it('returns deterministic defaults by viewport and route context', () => {
		expect(getDefaultShellPanelsState('desktop', { isForumRoute: true })).toEqual({
			leftOpen: true,
			rightOpen: true
		});
		expect(getDefaultShellPanelsState('tablet', { isForumRoute: true })).toEqual({
			leftOpen: true,
			rightOpen: false
		});
		expect(getDefaultShellPanelsState('mobile', { isForumRoute: true })).toEqual({
			leftOpen: false,
			rightOpen: false
		});
		expect(getDefaultShellPanelsState('desktop', { isForumRoute: false })).toEqual({
			leftOpen: false,
			rightOpen: false
		});
	});

	it('toggles desktop panels independently and mobile as drawers', () => {
		const desktopInitial = { leftOpen: true, rightOpen: true };
		expect(toggleShellPanel(desktopInitial, 'left', 'desktop', { isForumRoute: true })).toEqual({
			leftOpen: false,
			rightOpen: true
		});
		expect(toggleShellPanel(desktopInitial, 'right', 'desktop', { isForumRoute: true })).toEqual({
			leftOpen: true,
			rightOpen: false
		});

		const mobileInitial = { leftOpen: false, rightOpen: false };
		expect(toggleShellPanel(mobileInitial, 'left', 'mobile', { isForumRoute: true })).toEqual({
			leftOpen: true,
			rightOpen: false
		});
		expect(
			toggleShellPanel({ leftOpen: true, rightOpen: false }, 'right', 'mobile', {
				isForumRoute: true
			})
		).toEqual({
			leftOpen: false,
			rightOpen: true
		});
	});

	it('re-syncs to defaults when viewport or route mode changes', () => {
		const unchanged = syncShellPanelsToContext(
			{ leftOpen: false, rightOpen: true },
			{
				viewport: 'desktop',
				context: { isForumRoute: true },
				previousViewport: 'desktop',
				previousIsForumRoute: true
			}
		);
		expect(unchanged).toEqual({ leftOpen: false, rightOpen: true });

		const routeChanged = syncShellPanelsToContext(
			{ leftOpen: true, rightOpen: true },
			{
				viewport: 'desktop',
				context: { isForumRoute: false },
				previousViewport: 'desktop',
				previousIsForumRoute: true
			}
		);
		expect(routeChanged).toEqual({ leftOpen: false, rightOpen: false });

		const viewportChanged = syncShellPanelsToContext(
			{ leftOpen: false, rightOpen: false },
			{
				viewport: 'desktop',
				context: { isForumRoute: true },
				previousViewport: 'mobile',
				previousIsForumRoute: true
			}
		);
		expect(viewportChanged).toEqual({ leftOpen: true, rightOpen: true });
	});
});
