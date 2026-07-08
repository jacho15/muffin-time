# Redesign Plan — muffin-time

Working doc for the whole-app redesign. If a session dies, resume from the first unchecked item.
Full critique snapshot: `.impeccable/critique/2026-07-07T13-39-06Z__src.md` (baseline score **22/40**, 3×P1, 2×P2).

## Decisions (made 2026-07-07)
- **Order:** foundations first (P1s), visual pass second. The redesign lands on a usable base.
- **Depth:** discipline, keep identity. Cosmic night stays; DESIGN.md remains the target spec. Enforce its own rules (Quiet Gold, Starlight Floor, Borders-Not-Shadows); remove banned patterns (hero-metric template on Stats, eyebrow label on every panel). No palette rework.
- **Mobile:** phone-ready is in scope. Touch targets ≥44px, no hover-only affordances, Focus must work at any width.

## Phase 1 — Foundations (P1s)

### 1. `/impeccable adapt` — responsive + touch, app-wide
- [x] Focus at any width: panels were `hidden xl:flex` (hidden below 1280!); now stack below the timer (`order-*` + `flex-col xl:flex-row`), verified at 390px.
- [x] Sidebar → bottom tab bar below `md` (fixed bottom, safe-area padding, 44px targets, aria-labels, aria-current); hover tooltips hidden on the bottom bar.
- [x] Touch targets: nav buttons 44px on touch, period calendar days fluid up to 44px (`w-full max-w-11 aspect-square`), calendar chevrons padded on touch.
- [x] AppLayout responsive padding + `pb-24` clearance for the bottom bar; Lifestyle header wraps at phone width.
- [ ] Remaining: DatePicker popover day cells are 32px (dense popover, low priority); Events week grid + Tasks month grid not yet re-verified at 390px.

### 2. `/impeccable polish` — readability + small fixes
- [x] Contrast sweep across 20 files: readable copy → `/70`, tertiary metadata + micro-labels → `/60` (AA-passing), icons floored at `/50`, placeholders → `/60`. (Note: this refines the Starlight Floor Rule — amend DESIGN.md in Phase 2 to say copy ≥/70, micro-labels ≥/60.)
- [x] `.gold-btn:disabled` → quiet glass (no more olive); removed per-button `disabled:opacity` hacks.
- [x] "1 days" pluralization fixed (shared `plural()` in CycleStatsCards).
- [x] "No sessions found." → "No sessions in this range yet. Start one in Focus."
- [x] Prediction honesty: Next-period card now shows "rough guess — 1 cycle logged" or "based on N cycles".

### 3. `/impeccable harden` — a11y + safety
- [x] Global `:focus-visible` stardust ring in index.css.
- [x] Esc-to-close + `role="dialog"` + aria-modal + overlay-click-close via shared `useEscapeClose` hook: DayDetailDialog, ExpenseDialog, SessionEditDialog, SubjectEditDialog.
- [x] EventModal + TaskModal: Esc closes innermost popover first then the modal (nested-aware effect), plus `role="dialog"`/aria-modal; RecurrenceDialog got role/aria (parent modals own its Esc).
- [x] aria-labels: sidebar nav + sign-out, calendar chevrons, budget pencil, expense delete; period calendar days announce state ("July 15, fertile window"); FloatingTimer buttons already had `title`.
- [x] Expense row delete two-step (trash → "Sure?"); FocusView subject + session hover-deletes now two-step too (subject warns "removes its sessions").
- [x] Period calendar color-only legend: day cells carry aria-labels; visual shapes already differ (filled / dashed / tint).
- [x] `/impeccable harden` — silent Supabase failures now surface. Added a shared cosmic-night toast (`useToast.tsx`, `ToastProvider` in App.tsx, bottom-center, role=status/aria-live, reduced-motion aware, dedupes). The base hook (`useSupabaseTable`) toasts on failed create/update/remove/refetch and no longer swallows delete/fetch errors; custom hooks (`useFocusSessions` incl. the previously-silent `deleteSession`, `useUserSettings`, `useCalendars.toggleVisibility`) toast too. A `MutationOpts { silent }` opt-out lets the inline-error dialogs (ExpenseDialog, Subject/SessionEditDialog, DayDetailDialog, EventModal, Budgeting add-form) keep their inline message without a duplicate toast. Verified live: a forced 500 on a subject-add shows the toast, preserves the input, and doesn't add the row. Covers all 11 data hooks.

## Phase 2 — Visual discipline (P2s)

### 4. `/impeccable quieter` — gold discipline (Quiet Gold Rule) — DONE
Established the app-wide rule: **gold = one primary action per surface + the running timer + one decorative section-icon motif; stardust = selection / active / current.**
- [x] All segmented controls → stardust pills (Lifestyle tabs, Stats period, Tasks mode, Focus mode/unit/Active-Archived). Motion `layoutId` pills kept, just recolored.
- [x] Focus: 6 toggle actives + selected-subject Star + hover accents + the two mini-form submits (Add Subject/Session) → stardust. Start/Resume/timer stay gold.
- [x] Stats: metric numbers → star-white (dropped `gold-glow`), labels → /60, "Current" utility + subject-filter selection → stardust.
- [x] Events: "Today" utility + today date-marker + now-line/dot + Create-Calendar submit + add hover → stardust.
- [x] Dropdown selected-option highlights (CreatableSelect, TaskModal, EventModal) → stardust; Tasks calendar today-badge → stardust.
- [x] Kept gold (legitimate): modal Save/confirm (one per modal), header "Add Todo"/"Add" CTAs, running-timer digits, section-header icons, gym "done" state.

### 5. `/impeccable layout` — structure + rhythm (partial)
- [x] Content width: Lifestyle 3xl → 4xl (less left-hugging, stays left-aligned so titles line up with other views).
- [x] Stats hero-metric template softened (numbers now restrained star-white real data, no gold glow) — reads as data not decoration.
- [x] One header pattern across views: Focus now has a serif `Focus` page title (body wrapped in `flex flex-col h-full`, three columns in an inner `flex-1 min-h-0` row). Stats/Events/Tasks/Lifestyle already title-left; verified all five consistent in Playwright.
- [x] Stats heatmap tightened: grid + labels + legend wrapped in `w-max mx-auto` so it centers instead of floating in a top-left void (verified weekly 1-col + monthly). Single-column weekly heatmap oddness is a pre-existing viz choice, left as-is.
- [x] Eyebrow labels — DECIDED (Jacob, quiet sentence-case): retired tracked-uppercase `.section-label` on all 11 panels → new `.panel-title` (Inter 500, 13px, sentence case, star-white/80). `.section-label` class kept in index.css, reserved for rare deliberate kickers.
- [x] Heading levels fixed: panel titles are now `<h2 className="panel-title">` (was `<h3 className="section-label">`), so page `<h1>` → panel `<h2>` no longer skips a level. (EventsView "New Calendar" modal `<h3>` left untouched — it's a dialog title, not a panel header.)
- [~] Events `overflow-hidden` — VERIFIED FALSE POSITIVE. Only one overflow-hidden glass-panel (weekly grid); its absolute children are the calendar grid itself (hour lines, day/event columns), which are *meant* to be scroll-clipped. No dropdown/popover renders inside it (events open a separate modal). Left as-is — restructuring would be speculative churn.
- [x] Tokenize `#1a1040`: added `--color-nebula-deep` to the `@theme` block; body gradient now uses `var(--color-void/midnight/nebula-deep)` tokens (index.css).
- [~] Nested cards on Focus — VERIFIED FALSE POSITIVE. Only 2 `glass-panel` in FocusView, both top-level column panels; no panel-in-panel. Detector was flagging bordered `bg-glass` *controls* (segmented toggle, list rows) which DESIGN.md treats as their own components, not cards. Left as-is.
- [x] DESIGN.md sync pass — amended Starlight Floor Rule ("copy ≥/70, micro-labels ≥/60"), added Quiet Gold section-icon-motif exception, documented `.panel-title` (default panel heading) vs `.section-label` (rare kicker) split, and added the `nebula-deep` token to the color map + Neutral section.

## Phase 3 — Character + wrap-up
- [x] Idle Focus cat no longer cries: fresh idle → `eating` (cozy muffin-time snacking), idle-after-a-session → `happy`. One-line change in `getCatMood`; kept `hasFinishedSession` meaningful. No new asset (only happy/eating/crying PNGs exist); `crying.png` now unused. Ideal future touch: a bespoke `sleeping.png`.
- [x] Empty Events week: gentle `pointer-events-none` hint over the grid (CalendarPlus + "No events this week" / "Drag across a day to add one") when the week has no occurrences and ≥1 calendar exists. Teaches the drag-to-create affordance without blocking it.
- [x] Re-ran `/impeccable critique src` (single-context, matching baseline method). **Score 22 → 29/40 (+7), now in the "Good" band.** P1s: 3 → 0 (all baseline blockers resolved). Snapshot: `.impeccable/critique/2026-07-08T00-54-57Z__src.md`.
  - Deterministic CLI: 4 → 3 findings; the one real drift (`#1a1040`) is gone (tokenized). Remaining 3 are accepted (star-dot/scrollbar radius, Inter font).
  - Browser overlays: `skipped-heading` eliminated on all views; `ai-color-palette` 6–12→2–7/view; `dark-glow` "every view"→0–1/view. `nested-cards` (Focus) + `clipped-overflow-container` (Events) persist as confirmed false positives.
  - Biggest heuristic gains: Aesthetic 3→4, Match/Real-World 3→4, plus +1 on Control, Consistency, Error-Prevention, Recognition, Help.
  - Remaining (all P2/P3): older views swallow Supabase errors silently (`/impeccable harden`); click-only efficiency / no timer keyboard layer; DatePicker vs period-calendar selection-color leak.

## Context for a cold session
- PRODUCT.md / DESIGN.md are the specs (written 2026-07-06; register: product; North Star "The Midnight Study").
- Period tracker + ntfy notifications: DONE (cron 15:00 UTC, topic in .env, idempotent via `cycle_last_notified_phase`).
- Budget tracker + gym routine: DONE this week (BudgetingTab, GymRoutine, ExpenseDialog, useExpenses, useWorkoutLogs, lib/budget.ts); Supabase migration already run.
- Dev server: `npm run dev` → localhost:5173. Verify with `npm run build`, `npm test` (54 tests), `npx eslint <files>` (31 pre-existing errors in older files — don't fix unless asked).
