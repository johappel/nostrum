import { describe, expect, it } from 'vitest';
import { buildModerationPanelView, buildModerationQueue } from '../src/lib/routes/moderationPanels';
import type { LabelRow } from '../src/lib/data/db';

function makeLabel(input: {
	id: string;
	targetId: string;
	label: string;
	createdAt: number;
	author?: string;
	reason?: string;
}): LabelRow {
	return {
		id: input.id,
		eventId: `${input.id}:event`,
		community: 'community-test',
		targetId: input.targetId,
		label: input.label,
		reason: input.reason,
		author: input.author ?? 'npub-a',
		createdAt: input.createdAt
	};
}

describe('moderation panel view model', () => {
	it('hides moderation controls for non-moderators', () => {
		const queue = buildModerationQueue([
			makeLabel({
				id: 'l-1',
				targetId: 'post-1',
				label: 'mod:report',
				createdAt: 100
			})
		]);
		const view = buildModerationPanelView(false, queue);

		expect(view.canModerate).toBe(false);
		expect(view.showControls).toBe(false);
		expect(view.queue).toHaveLength(1);
	});

	it('renders report queue for empty and populated states deterministically', () => {
		const empty = buildModerationQueue([]);
		expect(empty).toEqual([]);
		expect(buildModerationPanelView(true, empty).isEmpty).toBe(true);

		const populated = buildModerationQueue([
			makeLabel({
				id: 'l-1',
				targetId: 'post-1',
				label: 'mod:report',
				reason: 'spam',
				createdAt: 100,
				author: 'npub-1'
			}),
			makeLabel({
				id: 'l-2',
				targetId: 'post-1',
				label: 'mod:report',
				reason: 'offtopic',
				createdAt: 110,
				author: 'npub-2'
			}),
			makeLabel({
				id: 'l-3',
				targetId: 'post-2',
				label: 'mod:move',
				createdAt: 105,
				author: 'npub-3'
			}),
			makeLabel({
				id: 'l-4',
				targetId: 'post-3',
				label: 'other:tag',
				createdAt: 200,
				author: 'npub-4'
			})
		]);

		expect(populated.map((item) => item.targetId)).toEqual(['post-1', 'post-2']);
		expect(populated[0]).toMatchObject({
			targetId: 'post-1',
			reportCount: 2,
			latestAuthor: 'npub-2'
		});
		expect(populated[0].reasons).toEqual(['offtopic', 'spam']);
		expect(buildModerationPanelView(true, populated).isEmpty).toBe(false);
	});
});
