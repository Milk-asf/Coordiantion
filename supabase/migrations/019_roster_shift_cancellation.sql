alter table public.roster_shifts
  add column if not exists cancelled_by text
    check (cancelled_by is null or cancelled_by in ('client', 'organisation')),
  add column if not exists cancellation_reason text not null default '';
