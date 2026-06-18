alter table public.roster_shifts
  add column if not exists shift_string_id uuid,
  add column if not exists shift_string_order integer not null default 0;

create index if not exists idx_roster_shifts_string
  on public.roster_shifts(workspace_id, shift_string_id)
  where shift_string_id is not null;
