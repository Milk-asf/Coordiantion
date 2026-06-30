-- Custom lists: members build saved "lists" over an existing data source
-- (participants, staff, documents, forms, incidents, tasks, shifts, timesheets,
-- invoices, reimbursements). Each list picks columns to display and can be
-- viewed as a table or a kanban board grouped by a chosen field. The records
-- themselves stay in their source tables; only the list configuration is stored.

create table public.custom_lists (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  name text not null default 'Untitled list',
  icon text not null default '📋',
  icon_color text not null default '#3BA3F8',

  source text not null,
  view text not null default 'table',
  columns jsonb not null default '[]'::jsonb,
  kanban_field text,

  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_custom_lists_workspace on public.custom_lists(workspace_id);
create index idx_custom_lists_updated on public.custom_lists(workspace_id, updated_at desc);

alter table public.custom_lists enable row level security;

create policy "Members can view custom lists"
  on public.custom_lists for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert custom lists"
  on public.custom_lists for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update custom lists"
  on public.custom_lists for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete custom lists"
  on public.custom_lists for delete
  using (public.is_workspace_member(workspace_id));
