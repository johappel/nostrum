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
Done

## Result
1. Added shared app shell components:
   - `src/lib/components/layout/app-shell.svelte`
   - `src/lib/components/layout/shellState.ts`
   - `src/lib/components/layout/index.ts`
2. Integrated shell into root layout:
   - `src/routes/+layout.svelte`
   - uses route pathname to drive forum-aware shell context
3. Implemented responsive shell behavior:
   - desktop: left + right sidebars as persistent panels
   - tablet/mobile: sidebars as drawers with backdrop
   - deterministic panel defaults per viewport + route context
4. Added topbar, sidebars, and footer context surfaces:
   - topbar: community context, relay sync indicator, quick actions, theme toggle
   - left sidebar: forum navigation and pending/failed quick status
   - right sidebar: member counts, sync metadata, route metadata
   - footer: relay + sync summary
5. Added app-shell styling:
   - `src/app.css` expanded with shell layout, drawer, and responsive rules
6. Added shell tests:
   - `tests/app-shell.state.test.ts`
   - `tests/app-shell.structure.test.ts`
7. Minor route integration update:
   - `src/routes/forums/[id]/+page.svelte` adds `id="new-thread"` anchor for topbar quick action

## Acceptance Criteria Check
1. Layout is usable on desktop and mobile.
   - Pass: desktop sidebars and mobile drawers implemented with responsive breakpoints.
2. Navigation context is always visible or one tap away.
   - Pass: topbar always visible; sidebars persistent on desktop and toggleable on smaller viewports.
3. `pnpm test` and `pnpm check` pass.
   - Pass: both commands pass after implementation.
