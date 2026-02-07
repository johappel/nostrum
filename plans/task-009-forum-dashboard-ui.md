# Task 009 - Forum Dashboard UI

## Goal
Redesign `/forums/:id` into a modern dashboard with thread feed, composer, and clear write state indicators.

## Scope
1. Thread list as cards with metadata and write-status badges.
2. New thread composer with optimistic feedback.
3. Filter/sort controls (latest, active, unresolved reports).
4. Empty, loading, and stale-cache states.

## Out of scope
1. Full text search implementation.
2. Rich text editor.

## Dependencies
1. Task 007 complete.
2. Task 008 complete.
3. Task 006 write flow remains active backend.

## Deliverables
1. Updated `/forums/[id]/+page.svelte` UI structure.
2. Reusable thread card and composer components.
3. Status messaging aligned with `pendingWrites` contract.

## Test plan (unit tests)
1. Optimistic thread submit shows immediate list insertion.
2. Failed publish shows deterministic retry affordance.
3. Empty and stale states render expected hints.

## Acceptance criteria
1. Dashboard shows immediate user feedback for writes.
2. Thread feed remains readable with dense metadata.
3. `pnpm test` and `pnpm check` pass.

## Status
Planned
