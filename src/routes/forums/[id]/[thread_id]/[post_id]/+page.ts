import type { PageLoad } from './$types';
import { mapThreadPostRouteData } from '$lib/routes/contracts';

export const load: PageLoad = ({ params }) => {
	return mapThreadPostRouteData(params);
};

