# Task 010 - Thread Detail UI

## Goal
Implement a state-of-the-art thread detail experience with clear hierarchy for root post, replies, reactions, and reports.

## Scope
1. Redesign thread detail composition (root hero + reply stream).
2. Integrate reaction/vote/report action bar.
3. Visualize per-target pending/confirmed/failed write states.
4. Keep post-focus route (`post_id`) highlight behavior.
5. Provide reply composer for thread replies and reply-to-reply interactions.

## Out of scope
1. Nested reply protocol changes.
2. Rich media attachments.

## Dependencies
1. Task 008 complete.
2. Task 009 recommended.
3. Task 006 write flow APIs available.

## Deliverables
1. Updated `src/lib/components/ThreadDetailView.svelte`.
2. Reusable action bar component(s).
3. Clear status UI for retries on failed writes.

## Test plan (unit tests)
1. Post focus highlight stays stable for `/forums/:id/:thread_id/:post_id`.
2. Reaction/report actions expose expected pending state.
3. Failed actions keep retry path visible.

## Acceptance criteria
1. Thread detail keeps high readability under activity.
2. Action outcomes are visible without page reload.
3. `pnpm test` and `pnpm check` pass.

## Status
Done

## Result
1. Redesigned thread detail experience:
   - `src/lib/components/ThreadDetailView.svelte`
   - clear root-post hero card + replies list (chronological list, not grid)
   - maintained post-focus highlighting for `post_id`
2. Added reusable action bar component:
   - `src/lib/components/thread/ThreadActionBar.svelte`
   - supports reaction/vote + report actions with per-target status chips
3. Added deterministic per-target write-state view model:
   - `src/lib/routes/threadDetailView.ts`
   - timeline building, focus validation, pending/confirmed/failed target-state mapping
   - failed write extraction for retry UI
4. Added retry path for failed writes directly in thread detail:
   - retries call `retryPendingWrite` from write-flow service
   - retry outcome updates status and toast feedback
5. Added thread-detail-specific unit tests:
   - `tests/thread-detail.view-model.test.ts`
   - verifies focus stability, pending/reaction/report status mapping, and failed retry visibility
6. Added thread reply write path and UI:
   - `src/lib/actions/writeFlow.ts`: `createReply(...)` with optimistic event + thread-head updates
   - `src/lib/components/ThreadDetailView.svelte`: composer for thread reply and targeted reply-to-reply
   - replies are persisted as `kind:11` with root `e` tag and optional reply `e` tag
7. Added reply write-flow unit test:
   - `tests/write-flow.actions.test.ts`
   - verifies root linkage for replies and deterministic thread-head update
8. Follow-up UX parity for reply/create placement:
   - `src/routes/forums/[id]/+page.svelte`
   - forum feed now mirrors thread behavior: primary CTA button first, composer below existing thread list

## Acceptance Criteria Check
1. Thread detail keeps high readability under activity.
   - Pass: root/reply hierarchy and list-first layout implemented.
2. Action outcomes are visible without page reload.
   - Pass: action status text + status chips + toast feedback + retry buttons + reply composer.
3. `pnpm test` and `pnpm check` pass.
   - Pass: both commands successful after reply composer integration.
