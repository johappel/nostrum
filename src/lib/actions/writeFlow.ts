import { SimplePool } from 'nostr-tools/pool';
import { evaluatePermissionsFromLists, type PermissionsView } from '$lib/permissions';
import {
	getDb,
	type LabelRow,
	type NostrEventRow,
	type PendingWriteAction,
	type PendingWriteRow,
	type PendingWriteStatus,
	type ReactionRow,
	type ThreadHeadRow
} from '$lib/data/db';

export interface UnsignedNostrEvent {
	kind: number;
	pubkey: string;
	created_at: number;
	tags: string[][];
	content: string;
}

export interface SignedNostrEvent extends UnsignedNostrEvent {
	id: string;
	sig: string;
}

export type SignEventFn = (event: UnsignedNostrEvent) => Promise<SignedNostrEvent>;
export type PublishEventFn = (event: SignedNostrEvent, relays: string[]) => Promise<void>;

export interface WriteFlowDeps {
	signEvent: SignEventFn;
	publishEvent: PublishEventFn;
	nowMs: () => number;
	resolvePermissions: (community: string, authorPubkey: string) => Promise<PermissionsView>;
}

export interface CreateThreadInput {
	community: string;
	authorPubkey: string;
	relays: string[];
	content: string;
	title?: string;
	forumSlug?: string;
}

export interface CreateReplyInput {
	community: string;
	authorPubkey: string;
	relays: string[];
	threadId: string;
	content: string;
	replyToId?: string;
	forumSlug?: string;
}

export interface CreateReactionInput {
	community: string;
	authorPubkey: string;
	relays: string[];
	targetId: string;
	value: string;
}

export interface CreateReportInput {
	community: string;
	authorPubkey: string;
	relays: string[];
	targetId: string;
	reason?: string;
	label?: string;
}

export interface RetryPendingWriteInput {
	pendingId: number;
	relays: string[];
}

export type WriteActionErrorReason =
	| 'db_unavailable'
	| 'permission_denied'
	| 'sign_failed'
	| 'invalid_pending_write';

export type WriteActionResult =
	| {
			ok: true;
			eventId: string;
			pendingId: number;
			status: PendingWriteStatus;
	  }
	| {
			ok: false;
			reason: WriteActionErrorReason;
			message: string;
	  };

interface WriteOperationContext {
	community: string;
	authorPubkey: string;
	relays: string[];
	action: PendingWriteAction;
	permission: keyof PermissionsView;
	kind: number;
	targetId: string;
	buildEvent: (createdAtSeconds: number) => UnsignedNostrEvent;
	optimisticInsert: (
		db: NonNullable<ReturnType<typeof getDb>>,
		event: SignedNostrEvent
	) => Promise<void>;
}

const NO_SIGNER_MESSAGE =
	'No signer configured. Provide a signer via createWriteFlowService({ signEvent }).';
const NO_PUBLISHER_MESSAGE =
	'No publisher configured. Provide publishEvent via createWriteFlowService({ publishEvent }).';

function getFirstTagValue(tags: string[][], key: string): string | null {
	const found = tags.find((tag) => tag[0] === key && typeof tag[1] === 'string' && tag[1].length > 0);
	return found?.[1] ?? null;
}

function getForumSlug(tags: string[][]): string {
	const forumTag = tags
		.filter((tag) => tag[0] === 't' && typeof tag[1] === 'string')
		.map((tag) => tag[1])
		.find((value) => value.startsWith('forum:'));
	if (!forumTag) return 'general';
	const slug = forumTag.slice('forum:'.length).trim().toLowerCase();
	return slug.length > 0 ? slug : 'general';
}

function getTitleFromEvent(event: SignedNostrEvent): string {
	const titleFromTag = getFirstTagValue(event.tags, 'title');
	if (titleFromTag) return titleFromTag;
	const content = event.content.trim();
	if (content.length > 0) return content.slice(0, 80);
	return `Thread ${event.id.slice(0, 8)}`;
}

function parseRootIdFromEvent(event: SignedNostrEvent): string {
	const eTags = event.tags.filter(
		(tag) => tag[0] === 'e' && typeof tag[1] === 'string' && tag[1].length > 0
	);
	if (eTags.length === 0) return event.id;
	const rootTag = eTags.find((tag) => tag[3] === 'root');
	return rootTag?.[1] ?? eTags[0][1];
}

function defaultNowMs(): number {
	return Date.now();
}

async function resolvePermissionsFromDb(
	community: string,
	authorPubkey: string
): Promise<PermissionsView> {
	const db = getDb();
	if (!db) {
		return {
			canPost: false,
			canReact: false,
			canModerate: false
		};
	}

	const lists = await db.lists.where('community').equals(community).toArray();
	return evaluatePermissionsFromLists({ userPubkey: authorPubkey, lists });
}

export function createNoopSigner(): SignEventFn {
	return async () => {
		throw new Error(NO_SIGNER_MESSAGE);
	};
}

export function createNoopPublisher(): PublishEventFn {
	return async () => {
		throw new Error(NO_PUBLISHER_MESSAGE);
	};
}

export function createBrowserNip07Signer(): SignEventFn {
	return async (event) => {
		if (typeof window === 'undefined') {
			throw new Error('NIP-07 signer unavailable in this runtime.');
		}
		const nip07 = (window as Window & {
			nostr?: { signEvent?: (evt: unknown) => Promise<unknown> };
		}).nostr;
		if (!nip07?.signEvent) {
			throw new Error('NIP-07 signer unavailable in this runtime.');
		}
		const signed = (await nip07.signEvent(event as any)) as SignedNostrEvent;
		return signed;
	};
}

export function createSimplePoolPublisher(pool = new SimplePool()): PublishEventFn {
	return async (event, relays) => {
		if (relays.length === 0) throw new Error('No relay configured.');
		await Promise.any(pool.publish(relays, event as any));
	};
}

function defaultDeps(): WriteFlowDeps {
	return {
		signEvent: createNoopSigner(),
		publishEvent: createNoopPublisher(),
		nowMs: defaultNowMs,
		resolvePermissions: resolvePermissionsFromDb
	};
}

function buildThreadHead(event: SignedNostrEvent, community: string): ThreadHeadRow {
	return {
		rootId: event.id,
		community,
		forumSlug: getForumSlug(event.tags),
		title: getTitleFromEvent(event),
		author: event.pubkey,
		lastActivityAt: event.created_at,
		replyCount: 0
	};
}

function toEventRow(event: SignedNostrEvent, community: string): NostrEventRow {
	const rootId = parseRootIdFromEvent(event);
	return {
		id: event.id,
		kind: event.kind,
		pubkey: event.pubkey,
		createdAt: event.created_at,
		community,
		forumSlug: getForumSlug(event.tags),
		rootId,
		content: event.content
	};
}

async function upsertThreadHeadForReply(
	db: NonNullable<ReturnType<typeof getDb>>,
	input: {
		community: string;
		rootId: string;
		replyCreatedAt: number;
		replyForumSlug: string;
		replyAuthor: string;
	}
): Promise<void> {
	const existing = await db.threadHeads.get(input.rootId);
	if (existing) {
		await db.threadHeads.put({
			...existing,
			lastActivityAt: Math.max(existing.lastActivityAt, input.replyCreatedAt),
			replyCount: existing.replyCount + 1
		});
		return;
	}

	const rootEvent = await db.events.get(input.rootId);
	await db.threadHeads.put({
		rootId: input.rootId,
		community: input.community,
		forumSlug: rootEvent?.forumSlug ?? input.replyForumSlug,
		title:
			rootEvent?.content.slice(0, 80) ||
			`Thread ${input.rootId.slice(0, 8)}`,
		author: rootEvent?.pubkey ?? input.replyAuthor,
		lastActivityAt: input.replyCreatedAt,
		replyCount: 1
	});
}

function toReactionRow(event: SignedNostrEvent, community: string): ReactionRow {
	const targetId = getFirstTagValue(event.tags, 'e');
	if (!targetId) {
		throw new Error('Reaction event missing required e-tag target.');
	}

	return {
		id: event.id,
		eventId: event.id,
		community,
		targetId,
		author: event.pubkey,
		value: event.content,
		createdAt: event.created_at
	};
}

function toReportRows(event: SignedNostrEvent, community: string): LabelRow[] {
	const targetId = getFirstTagValue(event.tags, 'e');
	if (!targetId) {
		throw new Error('Report event missing required e-tag target.');
	}

	const reason = getFirstTagValue(event.tags, 'reason') ?? undefined;
	const labels = event.tags
		.filter((tag) => tag[0] === 't' && typeof tag[1] === 'string' && tag[1].length > 0)
		.map((tag) => tag[1]);
	if (labels.length === 0) {
		throw new Error('Report event requires at least one t label tag.');
	}

	return labels.map((label) => ({
		id: `${event.id}:${label}`,
		eventId: event.id,
		community,
		targetId,
		label,
		reason,
		author: event.pubkey,
		createdAt: event.created_at
	}));
}

async function createPendingWrite(
	db: NonNullable<ReturnType<typeof getDb>>,
	input: {
		eventId: string;
		community: string;
		kind: number;
		action: PendingWriteAction;
		targetId: string;
		author: string;
		signedEvent: SignedNostrEvent;
		nowMs: number;
	}
): Promise<number> {
	return db.pendingWrites.add({
		eventId: input.eventId,
		community: input.community,
		kind: input.kind,
		action: input.action,
		targetId: input.targetId,
		author: input.author,
		status: 'pending',
		attemptCount: 0,
		signedEvent: JSON.stringify(input.signedEvent),
		createdAt: input.nowMs,
		updatedAt: input.nowMs
	});
}

async function updatePendingWriteStatus(
	db: NonNullable<ReturnType<typeof getDb>>,
	pendingId: number,
	status: PendingWriteStatus,
	nowMs: number,
	options?: {
		errorMessage?: string;
		incrementAttempts?: boolean;
	}
): Promise<PendingWriteRow | null> {
	const row = await db.pendingWrites.get(pendingId);
	if (!row) return null;

	const next: PendingWriteRow = {
		...row,
		status,
		updatedAt: nowMs,
		errorMessage: options?.errorMessage,
		attemptCount: row.attemptCount + (options?.incrementAttempts ?? false ? 1 : 0)
	};
	await db.pendingWrites.put(next);
	return next;
}

function sanitizeError(error: unknown): string {
	if (error instanceof AggregateError) {
		return error.errors.map((item) => String(item)).join(' | ');
	}
	return String(error);
}

function isValidSignedEvent(candidate: unknown): candidate is SignedNostrEvent {
	if (!candidate || typeof candidate !== 'object') return false;
	const event = candidate as Record<string, unknown>;
	return (
		typeof event.id === 'string' &&
		typeof event.sig === 'string' &&
		typeof event.pubkey === 'string' &&
		typeof event.kind === 'number' &&
		typeof event.created_at === 'number' &&
		typeof event.content === 'string' &&
		Array.isArray(event.tags)
	);
}

export interface WriteFlowService {
	createThread(input: CreateThreadInput): Promise<WriteActionResult>;
	createReply(input: CreateReplyInput): Promise<WriteActionResult>;
	createReaction(input: CreateReactionInput): Promise<WriteActionResult>;
	createReport(input: CreateReportInput): Promise<WriteActionResult>;
	retryPendingWrite(input: RetryPendingWriteInput): Promise<WriteActionResult>;
}

export function createWriteFlowService(partialDeps: Partial<WriteFlowDeps> = {}): WriteFlowService {
	const deps = {
		...defaultDeps(),
		...partialDeps
	};

	async function performWrite(operation: WriteOperationContext): Promise<WriteActionResult> {
		const db = getDb();
		if (!db) {
			return {
				ok: false,
				reason: 'db_unavailable',
				message: 'Database unavailable in this runtime.'
			};
		}

		const permissions = await deps.resolvePermissions(operation.community, operation.authorPubkey);
		if (!permissions[operation.permission]) {
			return {
				ok: false,
				reason: 'permission_denied',
				message: `Permission ${operation.permission} denied for ${operation.authorPubkey}.`
			};
		}

		const createdAtSeconds = Math.floor(deps.nowMs() / 1000);
		let signedEvent: SignedNostrEvent;
		try {
			signedEvent = await deps.signEvent(operation.buildEvent(createdAtSeconds));
		} catch (error) {
			return {
				ok: false,
				reason: 'sign_failed',
				message: sanitizeError(error)
			};
		}

		const nowMs = deps.nowMs();
		const pendingId = await db.transaction('rw', db.tables, async () => {
			await operation.optimisticInsert(db, signedEvent);
			return createPendingWrite(db, {
				eventId: signedEvent.id,
				community: operation.community,
				kind: operation.kind,
				action: operation.action,
				targetId: operation.targetId,
				author: operation.authorPubkey,
				signedEvent,
				nowMs
			});
		});

		try {
			await deps.publishEvent(signedEvent, operation.relays);
			await updatePendingWriteStatus(db, pendingId, 'confirmed', deps.nowMs(), {
				incrementAttempts: true
			});
			return {
				ok: true,
				eventId: signedEvent.id,
				pendingId,
				status: 'confirmed'
			};
		} catch (error) {
			await updatePendingWriteStatus(db, pendingId, 'failed', deps.nowMs(), {
				incrementAttempts: true,
				errorMessage: sanitizeError(error)
			});
			return {
				ok: true,
				eventId: signedEvent.id,
				pendingId,
				status: 'failed'
			};
		}
	}

	return {
		async createThread(input: CreateThreadInput): Promise<WriteActionResult> {
			const forumSlug = (input.forumSlug ?? 'general').trim().toLowerCase() || 'general';
			const title = input.title?.trim();
			const content = input.content.trim();
			return performWrite({
				community: input.community,
				authorPubkey: input.authorPubkey,
				relays: input.relays,
				action: 'thread',
				permission: 'canPost',
				kind: 11,
				targetId: '',
				buildEvent: (createdAtSeconds) => ({
					kind: 11,
					pubkey: input.authorPubkey,
					created_at: createdAtSeconds,
					tags: [
						['h', input.community],
						['t', `forum:${forumSlug}`],
						...(title ? [['title', title]] : [])
					],
					content
				}),
				optimisticInsert: async (db, event) => {
					const row = toEventRow(event, input.community);
					await db.events.put({
						...row,
						rootId: event.id
					});
					await db.threadHeads.put(buildThreadHead(event, input.community));
				}
			});
		},

		async createReply(input: CreateReplyInput): Promise<WriteActionResult> {
			const forumSlug = (input.forumSlug ?? 'general').trim().toLowerCase() || 'general';
			const rootId = input.threadId.trim();
			const parentId = (input.replyToId?.trim() || rootId).trim();
			const content = input.content.trim();
			return performWrite({
				community: input.community,
				authorPubkey: input.authorPubkey,
				relays: input.relays,
				action: 'thread',
				permission: 'canPost',
				kind: 11,
				targetId: parentId,
				buildEvent: (createdAtSeconds) => ({
					kind: 11,
					pubkey: input.authorPubkey,
					created_at: createdAtSeconds,
					tags: [
						['h', input.community],
						['t', `forum:${forumSlug}`],
						['e', rootId, '', 'root'],
						...(parentId !== rootId ? [['e', parentId, '', 'reply'] as string[]] : [])
					],
					content
				}),
				optimisticInsert: async (db, event) => {
					const row = toEventRow(event, input.community);
					await db.events.put({
						...row,
						rootId
					});
					await upsertThreadHeadForReply(db, {
						community: input.community,
						rootId,
						replyCreatedAt: event.created_at,
						replyForumSlug: forumSlug,
						replyAuthor: event.pubkey
					});
				}
			});
		},

		async createReaction(input: CreateReactionInput): Promise<WriteActionResult> {
			const value = input.value.trim();
			return performWrite({
				community: input.community,
				authorPubkey: input.authorPubkey,
				relays: input.relays,
				action: 'reaction',
				permission: 'canReact',
				kind: 7,
				targetId: input.targetId,
				buildEvent: (createdAtSeconds) => ({
					kind: 7,
					pubkey: input.authorPubkey,
					created_at: createdAtSeconds,
					tags: [
						['h', input.community],
						['e', input.targetId]
					],
					content: value
				}),
				optimisticInsert: async (db, event) => {
					await db.reactions.put(toReactionRow(event, input.community));
				}
			});
		},

		async createReport(input: CreateReportInput): Promise<WriteActionResult> {
			const label = (input.label?.trim() || 'mod:report').toLowerCase();
			return performWrite({
				community: input.community,
				authorPubkey: input.authorPubkey,
				relays: input.relays,
				action: 'report',
				permission: 'canModerate',
				kind: 1985,
				targetId: input.targetId,
				buildEvent: (createdAtSeconds) => ({
					kind: 1985,
					pubkey: input.authorPubkey,
					created_at: createdAtSeconds,
					tags: [
						['h', input.community],
						['e', input.targetId],
						['t', label],
						...(input.reason?.trim() ? [['reason', input.reason.trim()]] : [])
					],
					content: ''
				}),
				optimisticInsert: async (db, event) => {
					await db.labels.bulkPut(toReportRows(event, input.community));
				}
			});
		},

		async retryPendingWrite(input: RetryPendingWriteInput): Promise<WriteActionResult> {
			const db = getDb();
			if (!db) {
				return {
					ok: false,
					reason: 'db_unavailable',
					message: 'Database unavailable in this runtime.'
				};
			}

			const row = await db.pendingWrites.get(input.pendingId);
			if (!row) {
				return {
					ok: false,
					reason: 'invalid_pending_write',
					message: `Pending write ${input.pendingId} not found.`
				};
			}

			const parsed = JSON.parse(row.signedEvent) as unknown;
			if (!isValidSignedEvent(parsed)) {
				return {
					ok: false,
					reason: 'invalid_pending_write',
					message: `Pending write ${input.pendingId} has invalid signed event payload.`
				};
			}

			await updatePendingWriteStatus(db, input.pendingId, 'pending', deps.nowMs());

			try {
				await deps.publishEvent(parsed, input.relays);
				await updatePendingWriteStatus(db, input.pendingId, 'confirmed', deps.nowMs(), {
					incrementAttempts: true
				});
				return {
					ok: true,
					eventId: row.eventId,
					pendingId: input.pendingId,
					status: 'confirmed'
				};
			} catch (error) {
				await updatePendingWriteStatus(db, input.pendingId, 'failed', deps.nowMs(), {
					incrementAttempts: true,
					errorMessage: sanitizeError(error)
				});
				return {
					ok: true,
					eventId: row.eventId,
					pendingId: input.pendingId,
					status: 'failed'
				};
			}
		}
	};
}
