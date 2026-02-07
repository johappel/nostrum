import { derived, readable, type Readable } from 'svelte/store';
import { getDb } from '$lib/data/db';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export interface CommunityView {
	community: string;
	title: string;
	sections: Array<{ section: string; kinds: number[]; listRef: string }>;
	generalMemberCount: number;
	moderatorCount: number;
	generalMembers: string[];
	moderatorMembers: string[];
}

function normalizeMembers(members: string[] | undefined): string[] {
	if (!members || members.length === 0) return [];
	return [...new Set(members)].sort((a, b) => a.localeCompare(b));
}

export function createCommunityStore(community: string): Readable<CommunityView | null> {
	const db = getDb();
	if (!db) return readable(null);

	const sectionsStore = liveQueryReadable(
		() => db.sections.where('community').equals(community).toArray(),
		[]
	);
	const listsStore = liveQueryReadable(() => db.lists.where('community').equals(community).toArray(), []);
	const profileStore = liveQueryReadable(() => db.communityProfiles.get(community), null);

	return derived([sectionsStore, listsStore, profileStore], ([sections, lists, profile]) => {
		const generalList = lists.find((list) => list.dTag === 'General');
		const moderationList = lists.find((list) => list.dTag === 'Moderation');

		return {
			community,
			title: profile?.title ?? community,
			sections: sections.map((section) => ({
				section: section.section,
				kinds: section.kinds,
				listRef: section.listRef
			})),
			generalMemberCount: generalList?.members.length ?? 0,
			moderatorCount: moderationList?.members.length ?? 0,
			generalMembers: normalizeMembers(generalList?.members),
			moderatorMembers: normalizeMembers(moderationList?.members)
		};
	});
}
