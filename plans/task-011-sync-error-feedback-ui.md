# Task 011 - Sync and Error Feedback UI

## Goal
Make sync, relay health, and offline/error states explicit and actionable across forum and thread routes.

## Scope
1. Add sync progress and relay health indicators to topbar and panels.
2. Add stale-cache and partial relay failure alerts.
3. Add deterministic retry controls for failed writes.
4. Add toasts/alerts for high-impact actions and failures via `sonner`.

## Out of scope
1. Relay scoring/reputation algorithms.
2. Background push notifications.

## Dependencies
1. Task 008 complete.
2. Task 009 and 010 recommended.
3. Sync contracts from Task 005 unchanged.

## Deliverables
1. Unified sync/error UI components.
2. Consistent feedback behavior in `/forums/:id` and thread routes.
3. Documentation snippets for state semantics and toast event mapping.

## Test plan (unit tests)
1. Partial relay failure does not hide local cached content.
2. Stale cache state appears when sync freshness threshold exceeded.
3. Retry controls trigger deterministic retry functions.

## Acceptance criteria
1. User can distinguish loading, stale, failed, and healthy states quickly.
2. Error handling is actionable, not only informational.
3. `pnpm test` and `pnpm check` pass.

## Status
Planned
