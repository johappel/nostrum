# Task 002 - Event Projections

## Goal
Implement deterministic projection logic from raw events to read models (`thread_heads`, reactions, labels).

## Scope
1. Create pure projection functions in `src/lib/projections/*`.
2. Normalize forum roots, replies, reactions, labels.
3. Ensure projections are replay-safe.

## Out of scope
1. Relay fetching.
2. UI rendering.

## Dependencies
1. Task 001 complete.
2. `src/lib/data/db.ts` schema.

## Deliverables
1. Projection module for thread heads.
2. Projection module for reactions vote dedupe.
3. Projection module for moderation labels.

## Test plan (unit tests)
1. `kind:11` roots produce `thread_heads` rows.
2. Replies update `lastActivityAt` and `replyCount`.
3. Vote dedupe rule keeps latest `(targetId, author)` only.
4. Label projection groups by target and label.
5. Running same input twice produces identical output.

## Acceptance criteria
1. Projection functions are pure and deterministic.
2. Tests cover expected and malformed input variants.
3. No mutation of input event objects.

## Status
Done

## Result
1. Added pure projection modules in `src/lib/projections/*`:
   - `threadHeads.ts`
   - `reactions.ts`
   - `labels.ts`
2. Added unit tests in `tests/projections.test.ts` covering:
   - thread head projection from `kind:11`
   - reply count and last activity updates
   - vote/reaction dedupe by latest `(targetId, author)`
   - label grouping by target and label
   - deterministic output, malformed input tolerance, and no input mutation
3. Validation:
   - `pnpm test` passes
   - `pnpm check` passes
