-- Per-subject subsections (e.g. EE 370 -> Lecture, Lab, HW) that focus sessions can be tagged with.
-- Idempotent: this was first applied by hand in the SQL editor, so re-running must be a no-op.
create table if not exists public.subsections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists subsections_subject_id_idx on public.subsections (subject_id);

alter table public.subsections enable row level security;

drop policy if exists "Users manage their own subsections" on public.subsections;
create policy "Users manage their own subsections"
  on public.subsections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deleting a subsection keeps the session, just untagged.
alter table public.focus_sessions
  add column if not exists subsection_id uuid references public.subsections (id) on delete set null;
