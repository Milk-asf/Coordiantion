-- Closure review after investigation is completed

alter table public.incidents
  drop constraint if exists incidents_investigation_status_check;

alter table public.incidents
  add constraint incidents_investigation_status_check
    check (investigation_status in ('not_started', 'in_progress', 'completed', 'closed'));

alter table public.incidents
  add column if not exists closed_by_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists closed_by_name text not null default '',
  add column if not exists closure_notes text not null default '',
  add column if not exists closed_at timestamptz;
