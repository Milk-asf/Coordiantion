-- Incident reports (admin-only via RLS)

create table public.incidents (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  completed_by_staff_id uuid references public.staff(id) on delete set null,
  completed_by_name text not null default '',
  reported_by_staff_id uuid references public.staff(id) on delete set null,
  reported_by_name text not null default '',

  client_ids uuid[] not null default '{}',
  client_names text not null default '',
  worker_ids uuid[] not null default '{}',
  worker_names text not null default '',

  incident_date date not null,
  incident_start_time text not null default '',
  incident_end_time text not null default '',
  location text not null default '',
  other_parties text not null default '',

  category text not null,
  incident_status text not null default 'confirmed'
    check (incident_status in ('confirmed', 'alleged')),
  is_reportable boolean not null default false,
  ndis_reportable_category text,

  description text not null default '',
  witness_details text not null default '',
  impact_details text not null default '',
  actions_taken text not null default '',
  emergency_services_contacted text not null default 'no'
    check (emergency_services_contacted in ('no', 'yes')),
  organisation_notified boolean not null default false,

  attachments jsonb not null default '[]'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_incidents_workspace on public.incidents(workspace_id);
create index idx_incidents_date on public.incidents(workspace_id, incident_date desc);
create index idx_incidents_category on public.incidents(workspace_id, category);
create index idx_incidents_client_ids on public.incidents using gin (client_ids);

alter table public.incidents enable row level security;

create policy "Admins can view incidents"
  on public.incidents for select
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can insert incidents"
  on public.incidents for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update incidents"
  on public.incidents for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete incidents"
  on public.incidents for delete
  using (public.is_workspace_admin(workspace_id));
