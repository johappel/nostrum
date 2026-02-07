# Task 008 - App Shell Layout (Topbar + Sidebars + Footer)

## Goal
Implement the responsive application shell for forum routes with clear navigation and context surfaces.

## Scope
1. Build topbar with community context, sync status, and quick actions.
2. Build left sidebar for forum navigation/filters.
3. Build right sidebar for members, metadata, and pending writes.
4. Add responsive behavior (desktop/tablet/mobile drawer patterns).

## Out of scope
1. Deep thread rendering redesign.
2. Advanced theming variants.

## Dependencies
1. Task 007 complete.
2. Task 004 route contracts remain source of truth.

## Deliverables
1. Shared shell component(s) in `src/lib/components/layout/*`.
2. Route integration for `/forums/:id` and `/forums/:id/:thread_id`.
3. Footer with relay/sync meta summary.

## Test plan (unit tests)
1. Shell renders mandatory regions (`header/nav/main/aside/footer`).
2. Sidebar collapse state behaves deterministically.
3. Route pages keep existing data contracts and compile cleanly.

## Acceptance criteria
1. Layout is usable on desktop and mobile.
2. Navigation context is always visible or one tap away.
3. `pnpm test` and `pnpm check` pass.

## Status
Planned
