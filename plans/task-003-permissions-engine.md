# Task 003 - Permissions Engine

## Goal
Implement and verify permission evaluation aligned with Communikeys list-based access.

## Scope
1. Build explicit permission evaluator from `kind:30000` derived lists.
2. Support `canPost`, `canReact`, `canModerate`.
3. Integrate evaluator into `permissionsStore`.

## Out of scope
1. Badge issuing workflow.
2. Server-side enforcement.

## Dependencies
1. Task 001 complete.
2. Task 002 recommended.

## Deliverables
1. Pure permission function (`src/lib/permissions/*`).
2. Store integration using the function.
3. Documentation of precedence rules.

## Test plan (unit tests)
1. User in `General` => `canPost=true`, `canReact=true`.
2. User not in `General` => `canPost=false`, `canReact=false`.
3. User in `Moderation` => `canModerate=true`.
4. Missing list entries fail safe (deny by default).
5. List updates trigger store output changes.

## Acceptance criteria
1. All permission rules are codified in tests.
2. Deny-by-default behavior is enforced.
3. No hidden implicit fallback paths.

## Status
Planned

