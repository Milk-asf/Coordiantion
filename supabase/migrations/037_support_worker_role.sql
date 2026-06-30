-- Add the "support-worker" role to workspace_members.
-- Support workers have the smallest permission set: they can only access their
-- roster, incidents, and clients assigned to them. More capabilities will be
-- layered on later.

alter table public.workspace_members
  drop constraint if exists workspace_members_role_check;

alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('super-admin', 'admin', 'coordinator', 'support-worker'));
