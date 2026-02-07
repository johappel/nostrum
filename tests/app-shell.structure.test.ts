import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('app shell structure contract', () => {
	it('includes required layout landmarks', () => {
		const source = readFileSync(
			'src/lib/components/layout/app-shell.svelte',
			'utf8'
		);

		expect(source).toContain('<header');
		expect(source).toContain('<nav');
		expect(source).toContain('<main');
		expect(source).toContain('<aside');
		expect(source).toContain('<footer');
	});
});
