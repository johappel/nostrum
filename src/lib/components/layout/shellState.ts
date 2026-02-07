export type ShellViewport = 'desktop' | 'tablet' | 'mobile';
export type ShellSide = 'left' | 'right';

export interface ShellPanelsState {
	leftOpen: boolean;
	rightOpen: boolean;
}

export interface ShellContext {
	isForumRoute: boolean;
}

export function resolveShellViewport(width: number): ShellViewport {
	if (width < 768) return 'mobile';
	if (width < 1200) return 'tablet';
	return 'desktop';
}

export function getDefaultShellPanelsState(
	viewport: ShellViewport,
	context: ShellContext
): ShellPanelsState {
	if (!context.isForumRoute) {
		return {
			leftOpen: false,
			rightOpen: false
		};
	}

	if (viewport === 'desktop') {
		return {
			leftOpen: true,
			rightOpen: true
		};
	}

	if (viewport === 'tablet') {
		return {
			leftOpen: true,
			rightOpen: false
		};
	}

	return {
		leftOpen: false,
		rightOpen: false
	};
}

export function toggleShellPanel(
	state: ShellPanelsState,
	side: ShellSide,
	viewport: ShellViewport,
	context: ShellContext
): ShellPanelsState {
	if (!context.isForumRoute) {
		return {
			leftOpen: false,
			rightOpen: false
		};
	}

	if (viewport === 'desktop') {
		if (side === 'left') {
			return {
				...state,
				leftOpen: !state.leftOpen
			};
		}
		return {
			...state,
			rightOpen: !state.rightOpen
		};
	}

	const shouldOpen = side === 'left' ? !state.leftOpen : !state.rightOpen;
	return {
		leftOpen: side === 'left' ? shouldOpen : false,
		rightOpen: side === 'right' ? shouldOpen : false
	};
}

export function syncShellPanelsToContext(
	current: ShellPanelsState,
	input: {
		viewport: ShellViewport;
		context: ShellContext;
		previousViewport: ShellViewport | null;
		previousIsForumRoute: boolean | null;
	}
): ShellPanelsState {
	const viewportChanged = input.previousViewport !== input.viewport;
	const routeKindChanged = input.previousIsForumRoute !== input.context.isForumRoute;
	if (!viewportChanged && !routeKindChanged) return current;
	return getDefaultShellPanelsState(input.viewport, input.context);
}
