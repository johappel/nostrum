import { describe, expect, it } from 'vitest';
import {
	projectLabelsByTargetAndLabel,
	projectReactionCounts,
	projectThreadHeads,
	type RawNostrEvent
} from '../src/lib/projections';

function deepFreeze<T>(value: T): T {
	if (value && typeof value === 'object') {
		Object.freeze(value);
		for (const key of Object.keys(value as Record<string, unknown>)) {
			const nested = (value as Record<string, unknown>)[key];
			if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
				deepFreeze(nested);
			}
		}
	}
	return value;
}

describe('projection: thread heads', () => {
	it('projects kind:11 root and reply into one thread head', () => {
		const events: RawNostrEvent[] = [
			{
				id: 'root-1',
				kind: 11,
				pubkey: 'author-a',
				created_at: 1000,
				content: 'Root content',
				tags: [
					['h', 'community-a'],
					['title', 'Welcome Thread'],
					['t', 'forum:general']
				]
			},
			{
				id: 'reply-1',
				kind: 11,
				pubkey: 'author-b',
				created_at: 1200,
				content: 'Reply',
				tags: [
					['h', 'community-a'],
					['e', 'root-1', '', 'root'],
					['t', 'forum:general']
				]
			}
		];

		const heads = projectThreadHeads(events, 'community-a');
		expect(heads).toEqual([
			{
				rootId: 'root-1',
				community: 'community-a',
				forumSlug: 'general',
				title: 'Welcome Thread',
				author: 'author-a',
				lastActivityAt: 1200,
				replyCount: 1
			}
		]);
	});

	it('updates replyCount and lastActivityAt from replies', () => {
		const events: RawNostrEvent[] = [
			{
				id: 'root-2',
				kind: 11,
				pubkey: 'author-a',
				created_at: 2000,
				content: 'Root',
				tags: [['h', 'community-a'], ['t', 'forum:dev']]
			},
			{
				id: 'reply-2a',
				kind: 11,
				pubkey: 'author-c',
				created_at: 2100,
				content: 'A',
				tags: [['h', 'community-a'], ['e', 'root-2']]
			},
			{
				id: 'reply-2b',
				kind: 11,
				pubkey: 'author-d',
				created_at: 2500,
				content: 'B',
				tags: [['h', 'community-a'], ['e', 'root-2']]
			}
		];

		const [head] = projectThreadHeads(events, 'community-a');
		expect(head.rootId).toBe('root-2');
		expect(head.replyCount).toBe(2);
		expect(head.lastActivityAt).toBe(2500);
	});
});

describe('projection: reactions', () => {
	it('dedupes vote/reaction by latest (target, author)', () => {
		const events: RawNostrEvent[] = [
			{
				id: 'react-1',
				kind: 7,
				pubkey: 'alice',
				created_at: 1000,
				content: '+',
				tags: [['h', 'community-a'], ['e', 'root-1']]
			},
			{
				id: 'react-2',
				kind: 7,
				pubkey: 'alice',
				created_at: 1100,
				content: '-',
				tags: [['h', 'community-a'], ['e', 'root-1']]
			},
			{
				id: 'react-3',
				kind: 7,
				pubkey: 'bob',
				created_at: 1200,
				content: '+',
				tags: [['h', 'community-a'], ['e', 'root-1']]
			}
		];

		const counts = projectReactionCounts(events, 'community-a');
		expect(counts).toEqual({
			'root-1': {
				'-': 1,
				'+': 1
			}
		});
	});
});

describe('projection: labels', () => {
	it('groups labels by target and label', () => {
		const events: RawNostrEvent[] = [
			{
				id: 'label-1',
				kind: 1985,
				pubkey: 'mod-a',
				created_at: 1000,
				tags: [
					['h', 'community-a'],
					['e', 'root-1'],
					['t', 'mod:hide'],
					['reason', 'spam']
				]
			},
			{
				id: 'label-2',
				kind: 1985,
				pubkey: 'mod-b',
				created_at: 1200,
				tags: [
					['h', 'community-a'],
					['e', 'root-1'],
					['t', 'mod:report'],
					['reason', 'abuse']
				]
			}
		];

		const grouped = projectLabelsByTargetAndLabel(events, 'community-a');
		expect(grouped['root-1']['mod:hide']).toHaveLength(1);
		expect(grouped['root-1']['mod:report']).toHaveLength(1);
		expect(grouped['root-1']['mod:hide'][0].reason).toBe('spam');
	});
});

describe('projection: determinism and malformed input', () => {
	it('is deterministic, skips malformed events, and does not mutate input', () => {
		const input: RawNostrEvent[] = [
			{
				id: 'root-9',
				kind: 11,
				pubkey: 'author-x',
				created_at: 5000,
				content: 'Root nine',
				tags: [['h', 'community-z']]
			},
			{
				id: 'broken-1',
				kind: 11,
				pubkey: 'author-x',
				tags: [['h', 'community-z']]
			},
			{
				kind: 7,
				pubkey: 'user-a',
				created_at: 5100,
				content: '+',
				tags: [['h', 'community-z'], ['e', 'root-9']]
			}
		];

		const frozen = deepFreeze(input.map((event) => deepFreeze(structuredClone(event))));
		const before = JSON.stringify(frozen);

		const first = {
			threads: projectThreadHeads(frozen, 'community-z'),
			reactions: projectReactionCounts(frozen, 'community-z'),
			labels: projectLabelsByTargetAndLabel(frozen, 'community-z')
		};
		const second = {
			threads: projectThreadHeads(frozen, 'community-z'),
			reactions: projectReactionCounts(frozen, 'community-z'),
			labels: projectLabelsByTargetAndLabel(frozen, 'community-z')
		};

		expect(first).toEqual(second);
		expect(first.threads).toHaveLength(1);
		expect(first.reactions).toEqual({});
		expect(first.labels).toEqual({});
		expect(JSON.stringify(frozen)).toBe(before);
	});
});

