import { describe, expect, it } from 'vitest';
import {
	buildForumHubItems,
	normalizeCommunityId,
	validateCommunityId,
	validateCommunityTitle
} from '../src/lib/routes/forumsHub';
import type { CommunityProfileRow, ListRow, SectionRow, ThreadHeadRow } from '../src/lib/data/db';

describe('forums hub view model', () => {
	it('normalizes and validates community IDs deterministically', () => {
		expect(normalizeCommunityId('  Neue_Community !!  ')).toBe('neue-community');

		expect(validateCommunityId('ab', [])).toEqual({
			ok: false,
			message: 'Forum-ID muss mindestens 3 Zeichen haben.'
		});

		expect(validateCommunityId('demo', ['demo', 'alpha'])).toEqual({
			ok: false,
			message: 'Forum `demo` existiert bereits.'
		});

		expect(validateCommunityId('  Neue Community  ', ['demo'])).toEqual({
			ok: true,
			community: 'neue-community'
		});

		expect(validateCommunityTitle('ab')).toEqual({
			ok: false,
			message: 'Forum-Titel muss mindestens 3 Zeichen haben.'
		});
		expect(validateCommunityTitle('Nostr Dev Forum')).toEqual({
			ok: true,
			title: 'Nostr Dev Forum'
		});
	});

	it('builds sorted forum hub items with member and activity counts', () => {
		const sections: SectionRow[] = [
			{ community: 'alpha', section: 'General', kinds: [11], listRef: 'ref-a' },
			{ community: 'demo', section: 'General', kinds: [11], listRef: 'ref-d' }
		];
		const lists: ListRow[] = [
			{ community: 'alpha', dTag: 'General', members: ['a1', 'a2'], updatedAt: 10 },
			{ community: 'alpha', dTag: 'Moderation', members: ['a2'], updatedAt: 10 },
			{ community: 'demo', dTag: 'General', members: ['d1'], updatedAt: 10 }
		];
		const profiles: CommunityProfileRow[] = [
			{ community: 'alpha', title: 'Alpha Forum', updatedAt: 20 },
			{ community: 'demo', title: 'Demo Community', updatedAt: 20 }
		];
		const heads: ThreadHeadRow[] = [
			{
				rootId: 'd-1',
				community: 'demo',
				forumSlug: 'general',
				title: 'Demo 1',
				author: 'd1',
				lastActivityAt: 120,
				replyCount: 1
			},
			{
				rootId: 'd-2',
				community: 'demo',
				forumSlug: 'general',
				title: 'Demo 2',
				author: 'd2',
				lastActivityAt: 140,
				replyCount: 0
			},
			{
				rootId: 'a-1',
				community: 'alpha',
				forumSlug: 'general',
				title: 'Alpha 1',
				author: 'a1',
				lastActivityAt: 110,
				replyCount: 0
			}
		];

		const items = buildForumHubItems({
			sections,
			lists,
			profiles,
			threadHeads: heads
		});

		expect(items.map((item) => item.community)).toEqual(['demo', 'alpha']);
		expect(items[0]).toMatchObject({
			community: 'demo',
			title: 'Demo Community',
			threadCount: 2,
			generalMemberCount: 1,
			moderatorCount: 0,
			lastActivityAt: 140
		});
		expect(items[1]).toMatchObject({
			community: 'alpha',
			title: 'Alpha Forum',
			threadCount: 1,
			generalMemberCount: 2,
			moderatorCount: 1,
			lastActivityAt: 110
		});
	});
});
