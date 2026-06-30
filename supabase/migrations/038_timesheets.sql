-- Timesheets: support workers log a work session (one shift) with travel claims,
-- notes and a signature. Admin/finance review them via a status workflow.

create table public.timesheets (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  submitted_by_name text not null default '',
  shift_id uuid references public.roster_shifts(id) on delete set null,
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0,
  worked_minutes integer not null default 0,
  notes text not null default '',
  signature text not null default '',
  travel_claims jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'returned', 'approved')),
  review_note text not null default '',
  reviewed_by_name text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_timesheets_workspace
  on public.timesheets(workspace_id, created_at desc);

create index idx_timesheets_staff
  on public.timesheets(workspace_id, staff_id, start_date);

create index idx_timesheets_status
  on public.timesheets(workspace_id, status);

alter table public.timesheets enable row level security;

create policy "Members can view timesheets"
  on public.timesheets for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert timesheets"
  on public.timesheets for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update timesheets"
  on public.timesheets for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete timesheets"
  on public.timesheets for delete
  using (public.is_workspace_member(workspace_id));
