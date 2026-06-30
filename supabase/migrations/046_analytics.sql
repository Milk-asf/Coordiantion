-- Custom analytics: members build "spaces" (analytics dashboards) containing
-- widgets that aggregate live data from existing sources (shifts, incidents,
-- tasks, invoices, timesheets, reimbursements, participants, staff). Widget
-- definitions are stored as a JSON array; the data itself is computed in the
-- client from the relevant workspace records.

create table public.analytics_spaces (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  name text not null default 'Untitled space',
  description text not null default '',
  icon text not null default '📊',
  icon_color text not null default '#3b82f6',

  widgets jsonb not null default '[]'::jsonb,

  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_analytics_spaces_workspace on public.analytics_spaces(workspace_id);
create index idx_analytics_spaces_updated on public.analytics_spaces(workspace_id, updated_at desc);

alter table public.analytics_spaces enable row level security;

create policy "Members can view analytics spaces"
  on public.analytics_spaces for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert analytics spaces"
  on public.analytics_spaces for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update analytics spaces"
  on public.analytics_spaces for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete analytics spaces"
  on public.analytics_spaces for delete
  using (public.is_workspace_member(workspace_id));
