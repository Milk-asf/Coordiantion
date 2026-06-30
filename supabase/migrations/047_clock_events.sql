-- Clock on/off audit log: records when and where a worker clocked on or off.

create table public.clock_events (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  submitted_by_name text not null default '',
  timesheet_id uuid references public.timesheets(id) on delete set null,
  event_type text not null check (event_type in ('clock_on', 'clock_off')),
  recorded_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  location_label text not null default '',
  created_at timestamptz not null default now()
);

create index idx_clock_events_workspace
  on public.clock_events(workspace_id, recorded_at desc);

create index idx_clock_events_staff
  on public.clock_events(workspace_id, staff_id, recorded_at desc);

create index idx_clock_events_timesheet
  on public.clock_events(timesheet_id);

alter table public.clock_events enable row level security;

create policy "Members can view clock events"
  on public.clock_events for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert clock events"
  on public.clock_events for insert
  with check (public.is_workspace_member(workspace_id));
