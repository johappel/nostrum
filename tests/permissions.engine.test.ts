import { describe, expect, it } from 'vitest';
import { evaluatePermissionsFromLists } from '../src/lib/permissions';
import type { ListRow } from '../src/lib/data/db';

describe('permissions engine', () => {
	it('grants canPost and canReact when user is in General', () => {
		const lists: ListRow[] = [
			{
				community: 'community-a',
				dTag: 'General',
				members: ['user-1'],
				updatedAt: 1
			}
		];

		const permissions = evaluatePermissionsFromLists({
			userPubkey: 'user-1',
			lists
		});

		expect(permissions).toEqual({
			canPost: true,
			canReact: true,
			canModerate: false
		});
	});

	it('denies canPost and canReact when user is not in General', () => {
		const lists: ListRow[] = [
			{
				community: 'community-a',
				dTag: 'General',
				members: ['user-2'],
				updatedAt: 1
			}
		];

		const permissions = evaluatePermissionsFromLists({
			userPubkey: 'user-1',
			lists
		});

		expect(permissions).toEqual({
			canPost: false,
			canReact: false,
			canModerate: false
		});
	});

	it('grants canModerate when user is in Moderation', () => {
		const lists: ListRow[] = [
			{
				community: 'community-a',
				dTag: 'General',
				members: ['user-1'],
				updatedAt: 1
			},
			{
				community: 'community-a',
				dTag: 'Moderation',
				members: ['user-1'],
				updatedAt: 1
			}
		];

		const permissions = evaluatePermissionsFromLists({
			userPubkey: 'user-1',
			lists
		});

		expect(permissions.canModerate).toBe(true);
	});

	it('fails safe when lists are missing (deny by default)', () => {
		const permissions = evaluatePermissionsFromLists({
			userPubkey: 'user-1',
			lists: []
		});

		expect(permissions).toEqual({
			canPost: false,
			canReact: false,
			canModerate: false
		});
	});
});

