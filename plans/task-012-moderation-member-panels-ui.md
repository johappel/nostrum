# Task 012 - Moderation and Member Panels UI

## Goal
Provide guarded moderation and member-management panels integrated into the app shell.

## Scope
1. Add member panel with General/Moderation group visibility.
2. Add moderation panel for report queue and actions (hide/move surface).
3. Gate moderation controls by `canModerate`.
4. Keep non-moderator experience clean (no dead controls).

## Out of scope
1. Full moderation backend implementation (hide/move event logic).
2. Badge issuance workflows.

## Dependencies
1. Task 008 complete.
2. Task 011 recommended.
3. Moderation contracts from architecture docs.

## Deliverables
1. Right-sidebar moderation/member panels.
2. Guarded control rendering linked to permissions store.
3. Placeholder integration points for Task 013+ moderation backend.

## Test plan (unit tests)
1. Moderator controls hidden for non-moderators.
2. Report queue list rendering handles empty and populated states.
3. Panel state remains stable across route changes.

## Acceptance criteria
1. Moderation controls are role-gated and explicit.
2. Member visibility supports community context and trust.
3. `pnpm test` and `pnpm check` pass.

## Result
1. Added member and moderation panel view-model logic:
   - `src/lib/routes/moderationPanels.ts`
   - deterministic report queue projection from `mod:*` labels
   - explicit moderation gating (`showControls` only for moderators)
2. Added moderation label store for right-sidebar queue data:
   - `src/lib/stores/moderation.ts`
   - exported via `src/lib/stores/index.ts`
3. Extended community store with member lists for panel rendering:
   - `src/lib/stores/community.ts`
   - includes `generalMembers` and `moderatorMembers`
4. Integrated right-sidebar panels in app shell:
   - `src/lib/components/layout/app-shell.svelte`
   - member panel (General + Moderation lists)
   - moderation panel (report queue + guarded placeholder actions Hide/Move)
5. Added styling for panel sections and queue items:
   - `src/app.css`

## Placeholder integration points (Task 013+)
1. Moderation action buttons `Hide` and `Move` are intentionally disabled placeholders.
2. Queue item structure includes `targetId`, labels, reasons, and latest actor/timestamp for future action handlers.

## Test results
1. Added unit tests:
   - `tests/moderation-panels.view-model.test.ts`
   - verifies non-moderator control hiding and queue empty/populated rendering
2. Extended shell state test:
   - `tests/app-shell.state.test.ts`
   - verifies panel state stability while staying in forum route context
3. Validation:
   - `pnpm check` passed
   - `pnpm test` passed (18 files, 60 tests)

## Status
Done
