# Task 004 - Route + Store Integration

## Goal
Ensure route load data and stores work together predictably for forum and thread pages.

## Scope
1. Validate `/forums/:id` page data flow.
2. Validate `/forums/:id/:thread_id` page data flow.
3. Prevent stale bindings when params change.

## Out of scope
1. CSS or visual design.
2. Full E2E navigation tests.

## Dependencies
1. Task 001 complete.
2. Task 002 and 003 recommended.

## Deliverables
1. Route-level data contract docs/tests.
2. Store subscription lifecycle tests.
3. Param-change behavior tests.

## Test plan (unit tests)
1. Forum route reads correct community from params.
2. Thread route reads correct thread id from params.
3. Store instances are recreated or updated when params change.
4. Thread detail store returns not-found state consistently.

## Acceptance criteria
1. Route and store contract is tested, not assumed.
2. No stale data after route param change.
3. Zero runtime warnings in `pnpm check`.

## Status
Planned

