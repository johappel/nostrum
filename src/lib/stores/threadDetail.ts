import Dexie from 'dexie';
import { readable, type Readable } from 'svelte/store';
import { getDb, type LabelRow, type NostrEventRow, type ReactionRow } from '$lib/data/db';
import { liveQueryReadable } from '$lib/stores/liveQueryReadable';

export interface ThreadDetailView {
	root: NostrEventRow | null;
	replies: NostrEventRow[];
	reactionsByTarget: Record<string, Record<string, number>>;
	labelsByTarget: Record<string, LabelRow[]>;
}

function aggregateReactions(rows: ReactionRow[]): Record<string, Record<string, number>> {
	const latestByTargetAndAuthor = new Map<string, ReactionRow>();
	for (const row of rows) {
		const key = `${row.targetId}:${row.author}`;
		const existing = latestByTargetAndAuthor.get(key);
		if (!existing || existing.createdAt < row.createdAt) {
			latestByTargetAndAuthor.set(key, row);
		}
	}

	const output: Record<string, Record<string, number>> = {};
	for (const row of latestByTargetAndAuthor.values()) {
		output[row.targetId] ??= {};
		output[row.targetId][row.value] = (output[row.targetId][row.value] ?? 0) + 1;
	}

	return output;
}

function groupLabels(rows: LabelRow[]): Record<string, LabelRow[]> {
	const output: Record<string, LabelRow[]> = {};
	for (const row of rows) {
		output[row.targetId] ??= [];
		output[row.targetId].push(row);
	}
	return output;
}

export function createThreadDetailStore(
	community: string,
	threadId: string
): Readable<ThreadDetailView> {
	const db = getDb();
	if (!db) {
		return readable({
			root: null,
			replies: [],
			reactionsByTarget: {},
			labelsByTarget: {}
		});
	}

	return liveQueryReadable(async () => {
		const events = await db.events
			.where('[community+rootId+createdAt]')
			.between([community, threadId, Dexie.minKey], [community, threadId, Dexie.maxKey])
			.sortBy('createdAt');

		const root = events.find((event) => event.id === threadId) ?? events.at(0) ?? null;
		const replies = root ? events.filter((event) => event.id !== root.id) : [];
		const targets = root ? [root.id, ...replies.map((reply) => reply.id)] : [];

		const reactions =
			targets.length > 0 ? await db.reactions.where('targetId').anyOf(targets).toArray() : [];
		const labels = targets.length > 0 ? await db.labels.where('targetId').anyOf(targets).toArray() : [];

		return {
			root,
			replies,
			reactionsByTarget: aggregateReactions(reactions),
			labelsByTarget: groupLabels(labels)
		};
	}, {
		root: null,
		replies: [],
		reactionsByTarget: {},
		labelsByTarget: {}
	});
}

