# AGENTS.md

## Purpose
This file defines how to work in this repository and what must be documented now vs later.

## Product Direction
1. Build a SvelteKit forum app on top of Communikeys.
2. Keep compatibility with `Communikeys-NIP.md`.
3. Avoid mixing in NIP-72 group behavior or NIP-29 logic.
4. Focus on the forum use case first.

## Current State
1. SvelteKit app is initialized.
2. Routes exist:
`/forums`
`/forums/:id`
`/forums/:id/:thread_id`
`/forums/:id/:thread_id/:post_id`
3. Dexie-based local data layer exists in `src/lib/data/db.ts`.
4. First stores exist in `src/lib/stores/*`.
5. Planning docs exist in `plans/architecture-communikeys-v2.md`, `plans/stores.md`, `UseCases.md`.

## Source Of Truth (Order)
1. `Communikeys-NIP.md`
2. `plans/architecture-communikeys-v2.md`
3. `UseCases.md`
4. `plans/stores.md`
5. Implementation in `src/`

If conflicts appear, resolve upward in this order.

## Non-Negotiable Technical Decisions
1. Community identity comes from `kind:10222` pubkey.
2. Forum posts use `kind:11` with `h=<community-pubkey>`.
3. `kind:30222` is for targeted publications, not primary forum thread posting.
4. Access control source of truth is Nostr lists (`kind:30000`) in client cache.
5. Local-first UX: render from Dexie first, sync relays in background.
6. Route param name uses `thread_id` (SvelteKit does not allow `thread-id` as param key).

## What The App Needs
1. Relay sync service:
Fetch, dedupe, and upsert events incrementally per community and stream.
2. Event normalization pipeline:
Convert raw events into `thread_heads`, reactions, labels, permissions projections.
3. Permissions engine:
Compute `canPost`, `canReact`, `canModerate` from `kind:30000` and moderation model.
4. Moderation workflows:
Soft hide, move, report handling, and list updates for membership changes.
5. Reliable offline-first behavior:
Fast startup from local DB, optimistic writes, retry on reconnect.
6. UI states:
Loading, stale cache notice, sync progress, and partial relay failure handling.
7. Error handling:
Malformed event tolerance, unavailable relays, and conflict resolution rules.
8. Testing:
Unit tests for projections and permissions; integration tests for route + store behavior.

## Must Be Documented Now
1. Event mapping spec:
Raw event kinds and tags -> local table fields in Dexie.
2. Sync contract:
How `sync_cursor` is advanced, reset rules, and replay behavior.
3. Conflict policy:
How duplicate/slightly divergent relay data is resolved deterministically.
4. Permission contract:
Exact algorithm for read/write/moderation rights evaluation.
5. Moderation contract:
Accepted labels and required tags for hide/move/report actions.
6. Route-data contract:
What each route expects from stores and load functions.
7. Write flow contract:
Create/sign/publish path and optimistic UI lifecycle.

## Testing Requirements (Mandatory)
1. Every architecture-relevant change must include unit tests.
2. Stores and architecture contracts must be tested together, not in isolation only.
3. No task is considered done without:
   - passing unit tests
   - updated task status
   - explicit acceptance criteria check

## Task File Convention
1. Each coherent task gets exactly one file under `plans/`.
2. File name format:
`task-XXX-short-name.md` (example: `task-001-sync-foundation.md`).
3. Required sections per task file:
   - Goal
   - Scope
   - Out of scope
   - Dependencies
   - Deliverables
   - Test plan (unit tests)
   - Acceptance criteria
   - Status

## Can Be Documented Later
1. Deployment and adapter strategy.
2. Metrics/analytics.
3. SEO details.
4. Theming/design system expansion.
5. Advanced caching or multi-account session management.

## Next Implementation Order
1. Add sync service module (`src/lib/sync/*`) with incremental relay ingestion.
2. Add event projection module (`src/lib/projections/*`) and wire into Dexie writes.
3. Replace demo seed path with real sync-backed data path.
4. Add write actions for new thread, reaction, vote, report.
5. Add moderation actions and guarded UI.
6. Add automated tests for permissions and projections.

## Coding Conventions
1. TypeScript strictness stays enabled.
2. Keep data transforms pure and testable.
3. Keep route components thin; business logic lives in `src/lib/*`.
4. Prefer deterministic behavior over implicit heuristics.
5. No destructive resets of local DB without explicit migration or user action.

## Done Criteria For A Feature
1. Spec updated in docs.
2. Store/data contracts implemented.
3. Route/UI integrated.
4. Error states handled.
5. `pnpm check` passes.
6. Tests added for critical logic.
