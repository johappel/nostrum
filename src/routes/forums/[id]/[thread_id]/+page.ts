import type { PageLoad } from './$types';
import { mapThreadRouteData } from '$lib/routes/contracts';

export const load: PageLoad = ({ params }) => {
	return mapThreadRouteData(params);
};
