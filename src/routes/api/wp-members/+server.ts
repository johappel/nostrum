import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { mockWpUsers } from '$lib/fixtures/mockWpUsers';

const WP_MEMBERS_ENDPOINT = env.WP_MEMBERS_ENDPOINT?.trim();

export async function GET({ fetch }) {
	if (!WP_MEMBERS_ENDPOINT) {
		return json(mockWpUsers);
	}

	let response: Response;
	try {
		response = await fetch(WP_MEMBERS_ENDPOINT, {
			headers: {
				accept: 'application/json'
			}
		});
	} catch {
		return json({ error: 'WP members endpoint is unreachable' }, { status: 502 });
	}

	if (!response.ok) {
		return json(
			{ error: `WP members endpoint returned status ${response.status}` },
			{ status: 502 }
		);
	}

	const payload = (await response.json()) as unknown;
	return json(payload);
}
