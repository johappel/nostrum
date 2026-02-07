import { getDb, type ListRow } from '$lib/data/db';

export interface WpMember {
	id: number;
	display_name: string;
	nostr_pubkey_hex: string;
}

export const HEX_PUBKEY_RE = /^[0-9a-f]{64}$/;

export function isValidHexPubkey(value: string): boolean {
	return HEX_PUBKEY_RE.test(value);
}

function isWpMember(value: unknown): value is WpMember {
	if (!value || typeof value !== 'object') return false;
	const row = value as Partial<WpMember>;
	return (
		typeof row.id === 'number' &&
		typeof row.display_name === 'string' &&
		typeof row.nostr_pubkey_hex === 'string'
	);
}

export function normalizeWpMembers(input: unknown): WpMember[] {
	if (!Array.isArray(input)) return [];

	const dedup = new Map<string, WpMember>();
	for (const raw of input) {
		if (!isWpMember(raw)) continue;
		const hex = raw.nostr_pubkey_hex.trim().toLowerCase();
		if (!isValidHexPubkey(hex)) continue;
		dedup.set(hex, {
			id: raw.id,
			display_name: raw.display_name.trim(),
			nostr_pubkey_hex: hex
		});
	}

	return [...dedup.values()];
}

export async function fetchWpMembers(
	endpoint: string,
	fetchFn: typeof fetch = fetch
): Promise<WpMember[]> {
	const response = await fetchFn(endpoint);
	if (!response.ok) {
		throw new Error(`WP members fetch failed: ${response.status}`);
	}
	const payload = (await response.json()) as unknown;
	return normalizeWpMembers(payload);
}

export async function upsertGeneralListFromWpMembers(input: {
	community: string;
	members: WpMember[];
	preserveExisting?: boolean;
}): Promise<ListRow | null> {
	const db = getDb();
	if (!db) return null;

	const existing = await db.lists
		.where('[community+dTag]')
		.equals([input.community, 'General'])
		.first();

	const imported = input.members.map((member) => member.nostr_pubkey_hex);
	const nextMembers = input.preserveExisting && existing
		? [...new Set([...existing.members, ...imported])]
		: imported;

	const row: ListRow = {
		id: existing?.id,
		community: input.community,
		dTag: 'General',
		members: nextMembers,
		updatedAt: Date.now()
	};

	await db.lists.put(row);
	return row;
}

export async function syncGeneralListFromWpEndpoint(input: {
	community: string;
	endpoint: string;
	fetchFn?: typeof fetch;
	preserveExisting?: boolean;
}): Promise<WpMember[]> {
	const members = await fetchWpMembers(input.endpoint, input.fetchFn);
	await upsertGeneralListFromWpMembers({
		community: input.community,
		members,
		preserveExisting: input.preserveExisting
	});
	return members;
}

