-- Comments: admins leave threaded comments on records (shifts, shift notes,
-- timesheets, travel claims, incidents) and address them to people with
-- @-mentions. A comment with no person mentioned is shown to admins (the
-- default); mentioning a person addresses it to them; mentioning @Admins
-- (notify_admins) also surfaces it to admins. Mentions are stored as a JSON
-- array of { id, name } where id is an auth user id or the literal 'admin'.

create table public.comments (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('shift', 'shift_note', 'timesheet', 'travel_claim', 'incident')),
  entity_id text not null,
  body text not null default '',
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  mentions jsonb not null default '[]'::jsonb,
  notify_admins boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_comments_workspace on public.comments(workspace_id, created_at);
create index idx_comments_entity on public.comments(workspace_id, entity_type, entity_id);

alter table public.comments enable row level security;

create policy "Members can view comments"
  on public.comments for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert comments"
  on public.comments for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update comments"
  on public.comments for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete comments"
  on public.comments for delete
  using (public.is_workspace_member(workspace_id));
