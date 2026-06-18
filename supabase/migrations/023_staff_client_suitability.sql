create table public.staff_client_suitability (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'suitable'
    check (status in ('suitable', 'preferred', 'disallowed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, staff_id, client_id)
);

create index idx_staff_client_suitability_client
  on public.staff_client_suitability(workspace_id, client_id);

create index idx_staff_client_suitability_staff
  on public.staff_client_suitability(workspace_id, staff_id);

alter table public.staff_client_suitability enable row level security;

create policy "Members can view staff client suitability"
  on public.staff_client_suitability for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert staff client suitability"
  on public.staff_client_suitability for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update staff client suitability"
  on public.staff_client_suitability for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete staff client suitability"
  on public.staff_client_suitability for delete
  using (public.is_workspace_member(workspace_id));
