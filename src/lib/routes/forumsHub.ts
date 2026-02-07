import type { ListRow, SectionRow, ThreadHeadRow } from '$lib/data/db';

export interface ForumHubItem {
	community: string;
	threadCount: number;
	generalMemberCount: number;
	moderatorCount: number;
	lastActivityAt: number | null;
}

export type CommunityValidationResult =
	| { ok: true; community: string }
	| { ok: false; message: string };

export function normalizeCommunityId(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function validateCommunityId(
	input: string,
	existingCommunities: string[]
): CommunityValidationResult {
	const community = normalizeCommunityId(input);
	if (community.length < 3) {
		return { ok: false, message: 'Forum-ID muss mindestens 3 Zeichen haben.' };
	}
	if (community.length > 48) {
		return { ok: false, message: 'Forum-ID darf maximal 48 Zeichen haben.' };
	}
	if (existingCommunities.includes(community)) {
		return { ok: false, message: `Forum \`${community}\` existiert bereits.` };
	}
	return { ok: true, community };
}

interface BuildForumHubItemsInput {
	sections: SectionRow[];
	lists: ListRow[];
	threadHeads: ThreadHeadRow[];
}

function compareHubItems(a: ForumHubItem, b: ForumHubItem): number {
	if (a.lastActivityAt === null && b.lastActivityAt === null) {
		return a.community.localeCompare(b.community);
	}
	if (a.lastActivityAt === null) return 1;
	if (b.lastActivityAt === null) return -1;
	if (a.lastActivityAt !== b.lastActivityAt) return b.lastActivityAt - a.lastActivityAt;
	return a.community.localeCompare(b.community);
}

export function buildForumHubItems(input: BuildForumHubItemsInput): ForumHubItem[] {
	const byCommunity = new Map<string, ForumHubItem>();

	function ensureItem(community: string): ForumHubItem {
		const existing = byCommunity.get(community);
		if (existing) return existing;
		const created: ForumHubItem = {
			community,
			threadCount: 0,
			generalMemberCount: 0,
			moderatorCount: 0,
			lastActivityAt: null
		};
		byCommunity.set(community, created);
		return created;
	}

	for (const section of input.sections) {
		ensureItem(section.community);
	}

	for (const list of input.lists) {
		const item = ensureItem(list.community);
		if (list.dTag === 'General') item.generalMemberCount = list.members.length;
		if (list.dTag === 'Moderation') item.moderatorCount = list.members.length;
	}

	for (const head of input.threadHeads) {
		const item = ensureItem(head.community);
		item.threadCount += 1;
		item.lastActivityAt =
			item.lastActivityAt === null
				? head.lastActivityAt
				: Math.max(item.lastActivityAt, head.lastActivityAt);
	}

	return [...byCommunity.values()].sort(compareHubItems);
}
