# Task 013 - Forum Hub Create Forum

## Goal
Enable creating a new forum directly from `/forums` and show forum entries from local data.

## Scope
1. Replace static `/forums` page with dynamic forum hub list from Dexie-backed store.
2. Add role-neutral "Forum erstellen" CTA at top and forum composer below existing forum list.
3. Validate and normalize forum IDs deterministically before creation.
4. Create local forum scaffold via existing local seed path to make new forum immediately usable.

## Out of scope
1. Dedicated Nostr publish flow for new community identity (`kind:10222`).
2. Relay-side community provisioning workflows.
3. Advanced forum metadata editing (name, description, avatar).

## Dependencies
1. Task 007 UI foundation complete.
2. Task 008 app shell complete.
3. Existing local DB seed path available (`ensureDemoData`).

## Deliverables
1. New forum hub view-model helper:
   - `src/lib/routes/forumsHub.ts`
2. New forum hub store:
   - `src/lib/stores/forumHub.ts`
3. Updated `/forums` route with:
   - dynamic forum list
   - top CTA button
   - composer section below list
4. Store export update:
   - `src/lib/stores/index.ts`

## Test plan (unit tests)
1. Community ID normalization and validation are deterministic.
2. Forum hub list projection sorts and aggregates counts consistently.
3. `pnpm check` and `pnpm test` pass.

## Acceptance criteria
1. User can create a new forum from `/forums` without leaving the page.
2. Forum list reflects local DB state, not static hardcoded entries.
3. Composer placement is consistent with thread-detail flow (CTA first, input below list).
4. `pnpm check` and `pnpm test` pass.

## Result
1. Added deterministic forum-hub projection and validation:
   - `src/lib/routes/forumsHub.ts`
2. Added Dexie-backed forum hub store:
   - `src/lib/stores/forumHub.ts`
3. Updated `/forums` page:
   - `src/routes/forums/+page.svelte`
   - dynamic forum cards
   - top `Forum erstellen` CTA
   - composer below list
4. Added unit tests:
   - `tests/forums-hub.view-model.test.ts`

## Status
Done
