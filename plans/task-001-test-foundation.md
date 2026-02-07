# Task 001 - Test Foundation

## Goal
Set up a stable unit-test foundation for SvelteKit + Dexie store logic.

## Scope
1. Add a test runner (`vitest`).
2. Add browser-like IndexedDB test environment (`fake-indexeddb`).
3. Add base test helpers for DB reset and fixture seeding.
4. Add CI-ready test script in `package.json`.

## Out of scope
1. Relay integration.
2. UI component screenshot or E2E tests.

## Dependencies
1. Existing `src/lib/data/db.ts`.
2. Existing store modules under `src/lib/stores/*`.

## Deliverables
1. `vitest` configuration.
2. Shared test setup file.
3. At least one smoke unit test for DB open + seed.

## Test plan (unit tests)
1. DB can initialize without runtime errors.
2. Demo seed creates required tables and rows.
3. Re-running seed is idempotent.

## Acceptance criteria
1. `pnpm test` exists and passes locally.
2. Test setup works without real browser.
3. Baseline tests are deterministic.

## Status
Done

## Result
1. `vitest` configured and runnable via `pnpm test`.
2. `fake-indexeddb` setup added for deterministic Dexie unit tests.
3. Baseline DB tests added:
   - DB init smoke test
   - seed baseline row counts
   - seed idempotency
