import { describe, expect, it } from 'vitest';
import { buildDemoSeedBundle } from '../src/lib/demo/relaySeed';

function getTagValues(tags: string[][], key: string): string[] {
	return tags.filter((tag) => tag[0] === key && typeof tag[1] === 'string').map((tag) => tag[1]);
}

describe('relay demo seed bundle', () => {
	it('builds deterministic core event set for one community', () => {
		const relayUrl = 'ws://127.0.0.1:7011';
		const bundle = buildDemoSeedBundle({
			relayUrl,
			baseTimestamp: 1_735_689_600
		});

		expect(bundle.communityPubkey).toHaveLength(64);
		expect(bundle.events.length).toBe(11);

		const kinds = bundle.events.map((event) => event.kind);
		expect(kinds).toEqual([10222, 30000, 30000, 11, 11, 11, 11, 11, 7, 7, 1985]);

		const definition = bundle.events[0];
		expect(getTagValues(definition.tags, 'r')).toContain(relayUrl);

		const kind11Events = bundle.events.filter((event) => event.kind === 11);
		for (const event of kind11Events) {
			expect(getTagValues(event.tags, 'h')).toContain(bundle.communityPubkey);
		}

		const rootEvents = kind11Events.filter((event) => getTagValues(event.tags, 'e').length === 0);
		expect(rootEvents.length).toBe(2);

		const reactionEvents = bundle.events.filter((event) => event.kind === 7);
		for (const event of reactionEvents) {
			expect(getTagValues(event.tags, 'h')).toContain(bundle.communityPubkey);
			expect(getTagValues(event.tags, 'e').length).toBeGreaterThan(0);
		}
	});
});
