-- =============================================================================
-- Migration 002: Security Hardening
-- Fixes: RPC auth, role-based RLS, view security, member policies
-- =============================================================================

-- 1. Fix create_workspace_for_user RPC — enforce auth.uid() = owner_id
-- =============================================================================

create or replace function public.create_workspace_for_user(workspace_name text, owner_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  -- Allow call when auth.uid() is null (post-signup before session hydrates)
  -- but reject mismatches when auth IS present
  if auth.uid() is not null and auth.uid() != owner_id then
    raise exception 'Cannot create workspace for another user';
  end if;

  -- Verify the owner_id corresponds to an actual auth user
  if not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Invalid user ID';
  end if;

  insert into public.workspaces (name, created_by)
  values (workspace_name, owner_id)
  returning id into new_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_id, owner_id, 'super-admin', 'active');

  insert into public.workspace_settings (workspace_id)
  values (new_id);

  insert into public.charges_config (workspace_id)
  values (new_id);

  insert into public.field_config (workspace_id)
  values (new_id);

  return new_id;
end;
$$;

-- 2. Role-based helper functions
-- =============================================================================

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('super-admin', 'admin')
  );
$$;

create or replace function public.is_workspace_super_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and status = 'active'
      and role = 'super-admin'
  );
$$;

-- 3. Tighten workspace_members policies — role-based INSERT/UPDATE/DELETE
-- =============================================================================

drop policy if exists "Members can insert workspace members" on public.workspace_members;
drop policy if exists "Members can update workspace members" on public.workspace_members;

create policy "Admins can insert workspace members"
  on public.workspace_members for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update workspace members"
  on public.workspace_members for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete workspace members"
  on public.workspace_members for delete
  using (public.is_workspace_admin(workspace_id));

-- 4. Tighten workspace_settings — only admins can modify
-- =============================================================================

drop policy if exists "Members can upsert workspace settings" on public.workspace_settings;
drop policy if exists "Members can update workspace settings" on public.workspace_settings;

create policy "Admins can insert workspace settings"
  on public.workspace_settings for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update workspace settings"
  on public.workspace_settings for update
  using (public.is_workspace_admin(workspace_id));

-- 5. Tighten invoices — only admins can insert/update/delete
-- =============================================================================

drop policy if exists "Members can insert invoices" on public.invoices;
drop policy if exists "Members can update invoices" on public.invoices;
drop policy if exists "Members can delete invoices" on public.invoices;

create policy "Admins can insert invoices"
  on public.invoices for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update invoices"
  on public.invoices for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete invoices"
  on public.invoices for delete
  using (public.is_workspace_admin(workspace_id));

-- 6. Tighten charges_config and field_config — only admins can modify
-- =============================================================================

drop policy if exists "Members can upsert charges config" on public.charges_config;
drop policy if exists "Members can update charges config" on public.charges_config;

create policy "Admins can insert charges config"
  on public.charges_config for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update charges config"
  on public.charges_config for update
  using (public.is_workspace_admin(workspace_id));

drop policy if exists "Members can upsert field config" on public.field_config;
drop policy if exists "Members can update field config" on public.field_config;

create policy "Admins can insert field config"
  on public.field_config for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update field config"
  on public.field_config for update
  using (public.is_workspace_admin(workspace_id));

-- 7. Fix workspace_members_with_profile view — use security_invoker
-- =============================================================================

drop view if exists public.workspace_members_with_profile;

create view public.workspace_members_with_profile
with (security_invoker = true)
as
select
  wm.*,
  coalesce(u.raw_user_meta_data ->> 'full_name', '') as user_full_name,
  coalesce(u.email, '') as user_email
from public.workspace_members wm
left join auth.users u on u.id = wm.user_id;

-- 8. Restrict workspace UPDATE to admins only
-- =============================================================================

drop policy if exists "Members can update their workspaces" on public.workspaces;

create policy "Admins can update their workspaces"
  on public.workspaces for update
  using (public.is_workspace_admin(id));
