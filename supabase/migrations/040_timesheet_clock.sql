-- Clock on/off: a worker can clock on to open a draft timesheet, then clock off
-- to stamp the end time. clock_active marks the single open session per worker.

alter table public.timesheets
  add column if not exists clock_active boolean not null default false,
  add column if not exists clocked_in_at timestamptz;

create index if not exists idx_timesheets_clock_active
  on public.timesheets(workspace_id, staff_id, clock_active);
