create table public.roster_shifts (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  notes text not null default '',
  location text not null default '',
  charge_type text not null default '',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_roster_shifts_workspace_date
  on public.roster_shifts(workspace_id, shift_date);

create index idx_roster_shifts_staff
  on public.roster_shifts(workspace_id, staff_id, shift_date);

create index idx_roster_shifts_client
  on public.roster_shifts(workspace_id, client_id, shift_date);

alter table public.roster_shifts enable row level security;

create policy "Members can view roster shifts"
  on public.roster_shifts for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert roster shifts"
  on public.roster_shifts for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update roster shifts"
  on public.roster_shifts for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete roster shifts"
  on public.roster_shifts for delete
  using (public.is_workspace_member(workspace_id));
