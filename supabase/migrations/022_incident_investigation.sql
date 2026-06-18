-- Admin investigation fields for incident reports

alter table public.incidents
  add column if not exists investigation_status text not null default 'not_started'
    check (investigation_status in ('not_started', 'in_progress', 'completed')),
  add column if not exists investigated_by_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists investigated_by_name text not null default '',
  add column if not exists investigation_summary text not null default '',
  add column if not exists investigation_root_cause text not null default '',
  add column if not exists investigation_corrective_actions text not null default '',
  add column if not exists investigation_preventative_actions text not null default '',
  add column if not exists investigation_completed_at timestamptz;
