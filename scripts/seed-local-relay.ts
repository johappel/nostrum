import WebSocket from 'ws';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import { buildDemoSeedBundle } from '../src/lib/demo/relaySeed';

useWebSocketImplementation(WebSocket);

const relayUrl = process.env.LOCAL_RELAY_URL?.trim() || 'ws://127.0.0.1:7011';
const baseTimestamp = process.env.DEMO_SEED_BASE_TS
	? Number(process.env.DEMO_SEED_BASE_TS)
	: undefined;

if (baseTimestamp !== undefined && !Number.isFinite(baseTimestamp)) {
	throw new Error('DEMO_SEED_BASE_TS must be a valid unix timestamp (seconds).');
}

const bundle = buildDemoSeedBundle({
	relayUrl,
	baseTimestamp
});

const pool = new SimplePool();

async function publishAll() {
	let success = 0;
	let failed = 0;

	for (const event of bundle.events) {
		try {
			await Promise.any(pool.publish([relayUrl], event));
			success += 1;
			console.log(`published kind=${event.kind} id=${event.id.slice(0, 12)}...`);
		} catch (error) {
			failed += 1;
			const message =
				error instanceof AggregateError
					? error.errors.map((item) => String(item)).join(' | ')
					: String(error);
			console.error(`failed kind=${event.kind} id=${event.id.slice(0, 12)}... :: ${message}`);
		}
	}

	pool.close([relayUrl]);

	console.log('');
	console.log(`relay: ${relayUrl}`);
	console.log(`community pubkey: ${bundle.communityPubkey}`);
	console.log(`forum route: /forums/${bundle.communityPubkey}`);
	console.log(`events success: ${success}/${bundle.events.length}`);

	if (failed > 0) {
		process.exitCode = 1;
	}
}

publishAll().catch((error) => {
	pool.close([relayUrl]);
	console.error(error);
	process.exit(1);
});
