import type { PageLoad } from './$types';
import { mapForumRouteData } from '$lib/routes/contracts';

export const load: PageLoad = ({ params }) => {
	return mapForumRouteData(params);
};
