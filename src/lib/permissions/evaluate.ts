import type { ListRow } from '$lib/data/db';

export interface PermissionsView {
	canPost: boolean;
	canReact: boolean;
	canModerate: boolean;
}

export function evaluatePermissionsFromMembers(input: {
	userPubkey: string;
	generalMembers?: string[];
	moderationMembers?: string[];
}): PermissionsView {
	const generalMembers = input.generalMembers ?? [];
	const moderationMembers = input.moderationMembers ?? [];

	const canPost = generalMembers.includes(input.userPubkey);
	const canModerate = moderationMembers.includes(input.userPubkey);

	return {
		canPost,
		canReact: canPost,
		canModerate
	};
}

export function evaluatePermissionsFromLists(input: {
	userPubkey: string;
	lists: ListRow[];
}): PermissionsView {
	const general = input.lists.find((list) => list.dTag === 'General');
	const moderation = input.lists.find((list) => list.dTag === 'Moderation');

	return evaluatePermissionsFromMembers({
		userPubkey: input.userPubkey,
		generalMembers: general?.members,
		moderationMembers: moderation?.members
	});
}

