import type { Readable } from 'svelte/store';
import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';

export function liveQueryReadable<T>(
	query: () => Promise<T> | T,
	initial: T
): Readable<T> {
	return readable(initial, (set) => {
		const subscription = liveQuery(query).subscribe({
			next: set,
			error: (error) => {
				console.error('liveQuery error', error);
			}
		});

		return () => subscription.unsubscribe();
	});
}

