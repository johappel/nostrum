import type { Readable } from 'svelte/store';

export function waitForStore<T>(
	store: Readable<T>,
	predicate: (value: T) => boolean,
	timeoutMs = 1000
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		let done = false;
		let unsubscribe: (() => void) | null = null;

		const finish = (fn: () => void) => {
			if (done) return;
			done = true;
			clearTimeout(timeout);
			if (unsubscribe) {
				unsubscribe();
			} else {
				queueMicrotask(() => unsubscribe?.());
			}
			fn();
		};

		const timeout = setTimeout(() => {
			finish(() => reject(new Error('Timed out waiting for store value')));
		}, timeoutMs);

		unsubscribe = store.subscribe((value) => {
			if (!predicate(value)) return;
			finish(() => resolve(value));
		});
	});
}
