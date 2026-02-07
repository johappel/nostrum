import { hexToBytes } from 'nostr-tools/utils';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';

export interface DemoKeyset {
	communitySecret: string;
	membershipAdminSecret: string;
	moderatorSecret: string;
	aliceSecret: string;
	bobSecret: string;
	claireSecret: string;
}

export interface DemoIdentity {
	name: string;
	secret: string;
	pubkey: string;
}

export interface DemoSeedBundle {
	communityPubkey: string;
	relayUrl: string;
	events: Array<ReturnType<typeof finalizeEvent>>;
	identities: DemoIdentity[];
}

export interface BuildDemoSeedInput {
	relayUrl: string;
	baseTimestamp?: number;
	keys?: Partial<DemoKeyset>;
}

const DEFAULT_BASE_TIMESTAMP = 1_735_689_600; // 2025-01-01T00:00:00Z

export const DEFAULT_DEMO_KEYS: DemoKeyset = {
	communitySecret: '1f1e1d1c1b1a191817161514131211100f0e0d0c0b0a09080706050403020100',
	membershipAdminSecret: '2f2e2d2c2b2a292827262524232221201f1e1d1c1b1a19181716151413121110',
	moderatorSecret: '3f3e3d3c3b3a393837363534333231302f2e2d2c2b2a29282726252423222120',
	aliceSecret: '4f4e4d4c4b4a494847464544434241403f3e3d3c3b3a39383736353433323130',
	bobSecret: '5f5e5d5c5b5a595857565554535251504f4e4d4c4b4a49484746454443424140',
	claireSecret: '6f6e6d6c6b6a696867666564636261605f5e5d5c5b5a59585756555453525150'
};

function mergeKeys(keys?: Partial<DemoKeyset>): DemoKeyset {
	return {
		...DEFAULT_DEMO_KEYS,
		...(keys ?? {})
	};
}

function createIdentity(name: string, secret: string): DemoIdentity {
	return {
		name,
		secret,
		pubkey: getPublicKey(hexToBytes(secret))
	};
}

function signEvent(
	secretHex: string,
	kind: number,
	createdAt: number,
	tags: string[][],
	content: string
) {
	return finalizeEvent(
		{
			kind,
			created_at: createdAt,
			tags,
			content
		},
		hexToBytes(secretHex)
	);
}

export function buildDemoSeedBundle(input: BuildDemoSeedInput): DemoSeedBundle {
	const keys = mergeKeys(input.keys);
	const base = input.baseTimestamp ?? DEFAULT_BASE_TIMESTAMP;
	const relayUrl = input.relayUrl;

	const identities: DemoIdentity[] = [
		createIdentity('community', keys.communitySecret),
		createIdentity('membership-admin', keys.membershipAdminSecret),
		createIdentity('moderator', keys.moderatorSecret),
		createIdentity('alice', keys.aliceSecret),
		createIdentity('bob', keys.bobSecret),
		createIdentity('claire', keys.claireSecret)
	];

	const community = identities[0];
	const membershipAdmin = identities[1];
	const moderator = identities[2];
	const alice = identities[3];
	const bob = identities[4];
	const claire = identities[5];

	const generalMembers = [community.pubkey, alice.pubkey, bob.pubkey, claire.pubkey, moderator.pubkey];

	const communityDefinition = signEvent(
		community.secret,
		10222,
		base,
		[
			['r', relayUrl],
			['content', 'General'],
			['k', '1111'],
			['k', '7'],
			['k', '1985'],
			['a', `30000:${membershipAdmin.pubkey}:General`, relayUrl],
			['content', 'Forum'],
			['k', '11'],
			['a', `30000:${membershipAdmin.pubkey}:General`, relayUrl],
			['description', 'Local relay demo community for Nostrum']
		],
		''
	);

	const generalList = signEvent(
		membershipAdmin.secret,
		30000,
		base + 1,
		[['d', 'General'], ...generalMembers.map((pubkey) => ['p', pubkey])],
		'Demo members synced from local source'
	);

	const moderationList = signEvent(
		membershipAdmin.secret,
		30000,
		base + 2,
		[['d', 'Moderation'], ['p', moderator.pubkey]],
		'Demo moderators'
	);

	const threadWelcomeRoot = signEvent(
		alice.secret,
		11,
		base + 10,
		[
			['h', community.pubkey],
			['t', 'forum:general'],
			['title', 'Willkommen im Demo Forum']
		],
		'Willkommen im lokalen Demo-Forum. Das ist der Start-Thread.'
	);

	const threadWelcomeReply1 = signEvent(
		bob.secret,
		11,
		base + 11,
		[
			['h', community.pubkey],
			['t', 'forum:general'],
			['e', threadWelcomeRoot.id, relayUrl, 'root']
		],
		'Cool, ich sehe den Thread im lokalen Relay.'
	);

	const threadWelcomeReply2 = signEvent(
		claire.secret,
		11,
		base + 12,
		[
			['h', community.pubkey],
			['t', 'forum:general'],
			['e', threadWelcomeRoot.id, relayUrl, 'root']
		],
		'Ich antworte auch, damit wir mehrere Posts im Thread haben.'
	);

	const threadTechRoot = signEvent(
		bob.secret,
		11,
		base + 20,
		[
			['h', community.pubkey],
			['t', 'forum:technik'],
			['title', 'Svelte + Nostr Architektur']
		],
		'Welche Store-Struktur wollt ihr fuer grosse Foren nutzen?'
	);

	const threadTechReply1 = signEvent(
		alice.secret,
		11,
		base + 21,
		[
			['h', community.pubkey],
			['t', 'forum:technik'],
			['e', threadTechRoot.id, relayUrl, 'root']
		],
		'Dexie-Projektionen plus route-spezifische Stores sind ein guter Start.'
	);

	const reactionHeart = signEvent(
		claire.secret,
		7,
		base + 22,
		[
			['h', community.pubkey],
			['e', threadTechRoot.id, relayUrl]
		],
		':heart:'
	);

	const reactionVoteUp = signEvent(
		moderator.secret,
		7,
		base + 23,
		[
			['h', community.pubkey],
			['e', threadTechRoot.id, relayUrl]
		],
		'+'
	);

	const reportLabel = signEvent(
		moderator.secret,
		1985,
		base + 24,
		[
			['h', community.pubkey],
			['e', threadWelcomeReply1.id, relayUrl],
			['t', 'mod:report'],
			['reason', 'demo']
		],
		''
	);

	return {
		communityPubkey: community.pubkey,
		relayUrl,
		events: [
			communityDefinition,
			generalList,
			moderationList,
			threadWelcomeRoot,
			threadWelcomeReply1,
			threadWelcomeReply2,
			threadTechRoot,
			threadTechReply1,
			reactionHeart,
			reactionVoteUp,
			reportLabel
		],
		identities
	};
}
