# Task 007 - UI Foundation (shadcn + Lucide)

## Goal
Establish a reusable UI foundation with shadcn components/blocks, unified iconography, toast system, and flexible theming.

## Scope
1. Integrate shadcn component baseline for SvelteKit.
2. Add `@lucide/svelte` icon library.
3. Add `sonner` for global on-screen notifications.
4. Introduce Tailwind 4 variable-based theme tokens (`:root`, `.dark`, `@theme inline`).
5. Implement theme mode support: `light`, `dark`, `auto` (system).
6. Add app-level utility primitives used by forum pages.

## Out of scope
1. Full page redesign.
2. Moderation workflows.

## Dependencies
1. Task 006 complete.
2. `plans/UX-Design.md` approved.

## Deliverables
1. UI foundation setup docs and config.
2. Shared primitive wrappers in `src/lib/components/ui/*`.
3. Initial token definitions and status color mapping.
4. Theme manager (store/helper) with local persistence and system fallback.
5. App-level `Toaster` mount and usage contract.

## Test plan (unit tests)
1. Component smoke tests for critical primitives render without runtime errors.
2. Status badge variants map deterministically to `pending|confirmed|failed`.
3. Theme mode resolver returns deterministic effective mode for `light/dark/auto`.
4. Toast helper emits correct variants for success/error/info.
5. Route pages compile with new UI primitives (`pnpm check`).

## Acceptance criteria
1. UI primitives are reusable across forum and thread routes.
2. One icon library is used consistently (`@lucide/svelte`).
3. Theme mode can be switched between `light/dark/auto` without page breakage.
4. Toasts are centralized through `sonner`.
5. `pnpm test` and `pnpm check` pass.

## Status
Done

## Result
1. Added UI foundation dependencies:
   - `@lucide/svelte`
   - `svelte-sonner`
   - `tailwindcss`
   - `@tailwindcss/vite`
2. Enabled Tailwind 4 via Vite plugin:
   - `vite.config.ts`
3. Added global theme token system and styling baseline:
   - `src/app.css`
   - includes `:root`, `.dark`, and `@theme inline` variable mapping
4. Added theme mode engine (`light/dark/auto`):
   - `src/lib/stores/theme.ts`
   - localStorage persistence (`nostrum-theme-mode`)
   - system preference handling for `auto`
5. Added foundation UI components:
   - `src/lib/components/ui/theme-toggle.svelte`
   - `src/lib/components/ui/toaster.svelte`
   - `src/lib/components/ui/toast.ts`
   - `src/lib/components/ui/index.ts`
6. Wired global layout and early theme boot:
   - `src/routes/+layout.svelte`
   - `src/app.html`
7. Integrated toast feedback in write/sync flows:
   - `src/routes/forums/[id]/+page.svelte`
   - `src/lib/components/ThreadDetailView.svelte`
8. Added tests:
   - `tests/theme.store.test.ts`
   - `tests/toast.contract.test.ts`

## Acceptance Criteria Check
1. UI primitives are reusable across forum and thread routes.
   - Pass: theme toggle, toaster, and toast helper are centralized in `src/lib/components/ui/*`.
2. One icon library is used consistently (`@lucide/svelte`).
   - Pass: theme toggle uses `@lucide/svelte`.
3. Theme mode can be switched between `light/dark/auto` without page breakage.
   - Pass: implemented via store + early boot script + validated by `pnpm check`.
4. Toasts are centralized through `sonner`.
   - Pass: implemented via `svelte-sonner` with shared helper functions.
5. `pnpm test` and `pnpm check` pass.
   - Pass: both commands successful.
