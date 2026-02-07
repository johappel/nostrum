import { json } from '@sveltejs/kit';
import { mockWpUsers } from '$lib/fixtures/mockWpUsers';

export function GET() {
	return json(mockWpUsers);
}

