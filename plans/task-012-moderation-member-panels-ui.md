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

## Status
Planned
