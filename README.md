# Muffin Time

A cozy study and focus companion: a focus timer with per-subject tracking, a weekly calendar, tasks, study stats, and lifestyle tracking in one cosmic-night workspace.

<p align="center">
  <img src="public/cats/happy.png" alt="Happy Muffin" width="150" />
  <img src="public/cats/eating.png" alt="Eating Muffin" width="150" />
  <img src="public/cats/crying.png" alt="Crying Muffin" width="150" />
</p>

## What it does and who it's for

Muffin Time is for students who want one place to plan the week and track where their study time actually goes. It is built as a daily driver: the focus timer runs for hours while you work, so it keeps running across tabs and survives the tab being closed.

- **Focus timer**: stopwatch, Pomodoro, and a test-pacing mode (a per-question countdown for timed exams). Time is logged per subject and optional subsection (e.g. EE 370 → Lecture / Lab / HW).
- **Calendar**: a week grid with drag-to-create, drag-to-move, copy/paste (Ctrl+C / Ctrl+V on the hovered event), and recurring events (daily, weekly, biweekly, monthly) with per-occurrence edits and skips.
- **Stats**: daily to yearly breakdowns, a GitHub-style activity heatmap, and per-subsection splits.
- **Tasks and lifestyle**: drag-and-drop to-dos and assignments, a period tracker with phase notifications, a budget tracker, and a gym log.
- **Guest mode**: try everything without an account; data stays in memory for the session.

## How it works

```
Browser (React SPA) ──supabase-js──▶ Supabase Postgres (row-level security per user)
        │
        └──fetch──▶ Vercel Functions (api/)
                      ├─ complaint.ts     → Resend (feedback email)
                      └─ cycle-notify.ts  → ntfy.sh (push notification), daily cron
```

- **Data access**: the SPA talks to Supabase directly with the public anon key and relies on row-level security to scope rows to their owner (queries also filter by `user_id`). The two server functions use the service-role key and verify the caller's Supabase JWT (or a cron secret) first.
- **Client cache**: `useSupabaseTable` fetches each table once and shares the rows between components through an in-memory cache. Writes update the shared list once Supabase confirms them; failures show a toast instead of failing silently.
- **Recurring events**: only the series and its exceptions are stored. `expandItems` (`src/lib/recurrence.ts`) expands each series into occurrences for the visible week, and `placeOnOccurrenceDate` (`src/lib/eventOccurrences.ts`) moves each one onto its date.
- **Time zones**: timestamps are stored in UTC (`timestamptz`) and always turned into dates in the viewer's local time zone. Occurrences keep their local wall-clock time, so a weekly 6 PM lecture stays at 6 PM across daylight-saving changes. Plain dates (task due dates, period logs) are stored as `YYYY-MM-DD` with no time zone. The cron job uses `CYCLE_TZ` to decide what "today" is.
- **Timer persistence**: a running session is written to the database when it starts. If the tab closes, a snapshot in `localStorage` restores it as paused, or finalizes it after a grace period.
- **Notifications without duplicates**: `cycle-notify` records the last phase it notified about and only updates that after a successful send. Running it twice (cron plus an in-app trigger) is harmless, and a failed send is retried on the next run.

## Design decision: expand recurrences on the client

Recurring events could be stored as one row per occurrence. Instead the app stores the rule (`recurrence`, `recurrence_until`) plus a small `recurrence_exceptions` table for single-occurrence skips and edits, and expands occurrences for the visible week in the browser.

- **Why**: editing "this and all future" events is a single row update, there's no background job to top up future occurrences, and an open-ended series doesn't grow the database.
- **Cost**: every week view re-runs the expansion (memoized, and deferred with `useDeferredValue` so navigation stays responsive), queries like "all events next month" can't be done in SQL alone, and exceptions are keyed by date, which makes time-zone handling important. An earlier bug put evening events on the next day because the date came from the UTC timestamp; `src/test/recurrence.test.ts` pins that down.

## Running it

**Prerequisites:** Node.js 20+, a Supabase project.

```bash
npm install
cp .env.example .env.local        # fill in your Supabase URL and anon key
npm run dev                        # http://localhost:5173
```

Database schema changes live in `supabase/migrations/`. Apply them with `supabase db push` or the Supabase GitHub integration.

The functions in `api/` run on Vercel; use `vercel dev` to run them locally. They need the server-only variables listed in `.env.example`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint (including React Compiler rules) |
| `npm run format` | Prettier |
| `npm run build` | Type-check and production build |

## Project structure

```
api/                  Vercel Functions (feedback email, cycle notification cron)
src/components/       Views by feature: events, focus, stats, tasks, lifestyle
src/hooks/            Data hooks (useSupabaseTable and one per table), timer state
src/lib/              Pure logic: recurrence, occurrence placement, cycle prediction
src/test/             Vitest unit tests for the pure logic
supabase/migrations/  SQL migrations
```

## What I'd improve next

- **Dragging a recurring event** currently moves the whole series; it should ask "this event or all events", like editing already does.
- **End-to-end tests** (Playwright, in guest mode) for the calendar and timer flows. Unit tests cover the pure logic, but the drag and keyboard interactions are only tested by hand.
- **Rate limiting on `api/complaint.ts`**: it requires a signed-in user, but nothing stops one account from sending many emails.
- **Guest mode persistence**: guest data is in-memory only; saving it in IndexedDB would let people try the app across reloads.
- **Full RRULE support** (e.g. "every Tuesday and Thursday") instead of the four fixed intervals.
