alter table public.roster_shifts
  add column if not exists admin_notes text not null default '';
