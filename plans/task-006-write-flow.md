# Task 006 - Write Flow (Optimistic + Reconcile)

## Goal
Implement create/sign/publish flow with optimistic UI and reconciliation.

## Scope
1. Add write actions for:
   - new thread (`kind:11`)
   - reaction/vote (`kind:7`)
   - report (`kind:1985`)
2. Add optimistic local insertion.
3. Reconcile local pending events with relay ack/failure states.

## Out of scope
1. Rich text editor.
2. Attachment upload pipeline.

## Dependencies
1. Task 001 complete.
2. Task 003 and 005 recommended.

## Deliverables
1. Write action module (`src/lib/actions/*`).
2. Pending state model in local DB or memory.
3. UI status indicators (pending/confirmed/failed).

## Test plan (unit tests)
1. Creating thread inserts optimistic item immediately.
2. Publish success marks event confirmed.
3. Publish failure marks event failed and keeps retry path.
4. Permission deny prevents write action before signing.

## Acceptance criteria
1. User sees immediate feedback on write actions.
2. Retry behavior is deterministic.
3. No duplicate final events after retries.

## Status
Planned

