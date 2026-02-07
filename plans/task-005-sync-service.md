# Task 005 - Sync Service

## Goal
Build relay sync ingestion with deterministic cursor updates and conflict handling.

## Scope
1. Add `src/lib/sync/*` module.
2. Implement incremental fetch based on `sync_cursor`.
3. Dedupe by event id and persist via projections.
4. Define replay and cursor reset behavior.

## Out of scope
1. Multi-account authentication.
2. Relay reputation/scoring.

## Dependencies
1. Task 001 complete.
2. Task 002 complete.

## Deliverables
1. Sync orchestrator interface.
2. Cursor advance logic.
3. Conflict resolution implementation notes.

## Test plan (unit tests)
1. New events are stored once even if seen from multiple relays.
2. Cursor advances only after successful transaction commit.
3. Failed batch does not corrupt cursor state.
4. Replay from old cursor produces same projections.

## Acceptance criteria
1. Sync behavior is deterministic and replay-safe.
2. Cursor logic is covered by tests.
3. Partial relay failure leaves local cache usable.

## Status
Done

## Result
1. Added sync module:
   - `src/lib/sync/types.ts`
   - `src/lib/sync/normalize.ts`
   - `src/lib/sync/service.ts`
   - `src/lib/sync/index.ts`
2. Implemented incremental ingestion with `sync_cursor` support:
   - per relay + community + stream cursor read/update
   - transactionally persisted events + derived tables
3. Implemented id-based dedupe and projection persistence:
   - event dedupe by `event.id`
   - thread head rebuild from persisted `kind:11`
   - reaction/label upserts from normalized events
4. Added cursor utility behaviors:
   - `getCursor`
   - `setCursor`
   - `resetCursorsForCommunity`
5. Added sync unit tests:
   - `tests/sync.service.test.ts`
   - verifies multi-relay dedupe
   - verifies cursor update only on successful commit
   - verifies failed batch atomicity
   - verifies replay determinism from reset cursor
6. Validation:
   - `pnpm test` passes
   - `pnpm check` passes
