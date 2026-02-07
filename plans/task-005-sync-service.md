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
Planned

