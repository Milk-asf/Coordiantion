-- Care plans: metadata in care_plans, file stored via documents table + storage bucket

create table public.care_plans (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  created_date date not null,
  renewal_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create index idx_care_plans_workspace on public.care_plans(workspace_id);
create index idx_care_plans_client on public.care_plans(client_id);
create index idx_care_plans_document on public.care_plans(document_id);

alter table public.care_plans enable row level security;

create policy "Members can view care plans"
  on public.care_plans for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert care plans"
  on public.care_plans for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update care plans"
  on public.care_plans for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete care plans"
  on public.care_plans for delete
  using (public.is_workspace_member(workspace_id));
