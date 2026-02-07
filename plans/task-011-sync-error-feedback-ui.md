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

## State semantics
1. `idle`: No relay cursor state exists yet.
2. `syncing`: Active sync request is running; cached content stays visible.
3. `healthy`: Relay cursor state exists and is fresh.
4. `stale`: Relay cursor state exists, but all relays are older than threshold.
5. `partial`: Only part of relay state is stale, or sync failed while cached relay state exists.
6. `failed`: Sync failed and no relay state exists; cached content visibility depends on local content availability.

## Toast mapping
1. Relay sync retry success -> success toast (`Relay-Sync erneut ausgefuehrt` / `Thread-Sync erneut ausgefuehrt`).
2. Relay sync failure -> error toast (`Relay-Sync fehlgeschlagen` / `Thread-Sync fehlgeschlagen`).
3. WP member sync success/failure -> success or error toast.
4. Thread/reaction/report writes and retries -> existing write-status toast contract.

## Result
1. Added unified sync feedback model in `src/lib/routes/syncFeedback.ts` and shared banner component `src/lib/components/sync/SyncFeedbackBanner.svelte`.
2. Integrated sync feedback into shell topbar/context panel via `src/lib/components/layout/app-shell.svelte`.
3. Integrated actionable sync feedback + relay retry in forum route `src/routes/forums/[id]/+page.svelte`.
4. Integrated same feedback pattern for thread detail via `src/lib/components/ThreadDetailView.svelte`.
5. Added deterministic thread retry candidate projection in `src/lib/routes/forumDashboard.ts`.
6. Added unit tests in `tests/sync-feedback.view-model.test.ts` and expanded `tests/forum-dashboard.view-model.test.ts`.

## Acceptance check
1. Loading/stale/failed/healthy/partial states are mapped into visible banner labels and compact topbar indicator.
2. Failed/stale/partial states expose retry actions in forum and thread routes.
3. `pnpm test` passed (17 files, 56 tests).
4. `pnpm check` passed (0 errors, 0 warnings).

## Status
Done
