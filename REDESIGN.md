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
- [ ] DEFERRED: older views swallow Supabase errors silently — surface inline errors like the lifestyle dialogs do. (Touches data layer across many views; lower risk to batch separately.)

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
- [ ] One header pattern across views (serif `page-title` left, controls right); Focus still has NO page title.
- [ ] Stats: heatmap floats in oversized dead panel — tighten.
- [ ] Eyebrow labels: `.section-label` on every panel — vary cadence (or keep as documented motif; decide).
- [ ] Fix h1→h3 skipped heading levels (Events, Stats, Lifestyle).
- [ ] Events: 2 `overflow-hidden` panels clip positioned children (dropdown risk) — restructure or portal.
- [ ] Tokenize or remove `#1a1040` (body gradient, index.css:28 — undocumented drift).
- [ ] Nested cards on Focus view (detector hit) — flatten.
- [ ] NOTE: amend DESIGN.md Starlight Floor Rule to "copy ≥/70, micro-labels ≥/60" and add the Quiet Gold clarification (section-icon motif exception) — do in a DESIGN.md sync pass.

## Phase 3 — Character + wrap-up
- [ ] The idle Focus cat is crying = guilt mechanics ("gentle, never nagging" violation). Change idle mood (sleeping cat?), keep charm.
- [ ] Empty Events week: add a visible "add event" affordance/hint.
- [ ] Re-run `/impeccable critique` for the score delta vs 22/40; update this file.

## Context for a cold session
- PRODUCT.md / DESIGN.md are the specs (written 2026-07-06; register: product; North Star "The Midnight Study").
- Period tracker + ntfy notifications: DONE (cron 15:00 UTC, topic in .env, idempotent via `cycle_last_notified_phase`).
- Budget tracker + gym routine: DONE this week (BudgetingTab, GymRoutine, ExpenseDialog, useExpenses, useWorkoutLogs, lib/budget.ts); Supabase migration already run.
- Dev server: `npm run dev` → localhost:5173. Verify with `npm run build`, `npm test` (54 tests), `npx eslint <files>` (31 pre-existing errors in older files — don't fix unless asked).
