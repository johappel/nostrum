import { describe, expect, it, vi } from 'vitest';
import { ensureDemoData, getDb } from '../src/lib/data/db';
import {
	fetchWpMembers,
	normalizeWpMembers,
	syncGeneralListFromWpEndpoint,
	upsertGeneralListFromWpMembers
} from '../src/lib/provisioning/wpMembers';

const HEX_A = 'a'.repeat(64);
const HEX_B = 'b'.repeat(64);
const HEX_C = 'c'.repeat(64);

describe('wp members provisioning', () => {
	it('normalizes, validates and deduplicates wp payload by pubkey', () => {
		const rows = normalizeWpMembers([
			{ id: 1, display_name: ' Alpha ', nostr_pubkey_hex: HEX_A.toUpperCase() },
			{ id: 2, display_name: 'Beta', nostr_pubkey_hex: HEX_B },
			{ id: 3, display_name: 'Duplicate', nostr_pubkey_hex: HEX_A },
			{ id: 4, display_name: 'Invalid', nostr_pubkey_hex: 'not-hex' },
			{ invalid: true }
		]);

		expect(rows).toEqual([
			{ id: 3, display_name: 'Duplicate', nostr_pubkey_hex: HEX_A },
			{ id: 2, display_name: 'Beta', nostr_pubkey_hex: HEX_B }
		]);
	});

	it('fetches members from endpoint and throws on non-ok responses', async () => {
		const okFetch: typeof fetch = vi.fn(async () =>
			new Response(JSON.stringify([{ id: 1, display_name: 'A', nostr_pubkey_hex: HEX_A }]), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);
		const failFetch: typeof fetch = vi.fn(async () =>
			new Response(JSON.stringify({}), {
				status: 503,
				headers: { 'content-type': 'application/json' }
			})
		);

		const members = await fetchWpMembers('https://example.test/wp-users', okFetch);
		expect(okFetch).toHaveBeenCalledWith('https://example.test/wp-users');
		expect(members).toEqual([{ id: 1, display_name: 'A', nostr_pubkey_hex: HEX_A }]);

		await expect(
			fetchWpMembers('https://example.test/wp-users', failFetch)
		).rejects.toThrow('WP members fetch failed: 503');
	});

	it('upserts General list from wp members (replace or merge)', async () => {
		await ensureDemoData('community-a');
		const db = getDb();
		if (!db) throw new Error('Database unavailable in test runtime');

		await upsertGeneralListFromWpMembers({
			community: 'community-a',
			members: [
				{ id: 10, display_name: 'A', nostr_pubkey_hex: HEX_A },
				{ id: 11, display_name: 'B', nostr_pubkey_hex: HEX_B }
			]
		});

		let general = await db.lists.where('[community+dTag]').equals(['community-a', 'General']).first();
		expect(general?.members).toEqual([HEX_A, HEX_B]);

		await upsertGeneralListFromWpMembers({
			community: 'community-a',
			members: [{ id: 12, display_name: 'C', nostr_pubkey_hex: HEX_C }],
			preserveExisting: true
		});

		general = await db.lists.where('[community+dTag]').equals(['community-a', 'General']).first();
		expect(general?.members).toEqual([HEX_A, HEX_B, HEX_C]);
	});

	it('syncs General list from endpoint payload', async () => {
		const fetchFn: typeof fetch = vi.fn(async () =>
			new Response(
				JSON.stringify([
					{ id: 20, display_name: 'Alpha', nostr_pubkey_hex: HEX_A },
					{ id: 21, display_name: 'Beta', nostr_pubkey_hex: HEX_B }
				]),
				{
					status: 200,
					headers: { 'content-type': 'application/json' }
				}
			)
		);

		const synced = await syncGeneralListFromWpEndpoint({
			community: 'community-b',
			endpoint: 'https://example.test/wp-users',
			fetchFn
		});

		expect(fetchFn).toHaveBeenCalledWith('https://example.test/wp-users');
		expect(synced).toEqual([
			{ id: 20, display_name: 'Alpha', nostr_pubkey_hex: HEX_A },
			{ id: 21, display_name: 'Beta', nostr_pubkey_hex: HEX_B }
		]);

		const db = getDb();
		if (!db) throw new Error('Database unavailable in test runtime');
		const general = await db.lists.where('[community+dTag]').equals(['community-b', 'General']).first();
		expect(general?.members).toEqual([HEX_A, HEX_B]);
	});
});
