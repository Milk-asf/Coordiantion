-- =============================================================================
-- Migration 059: Data-layer MFA enforcement (AAL2)
-- Users who have enrolled a verified second factor must be on an AAL2 session
-- for any read or write. Users without factors are unaffected, so this is safe
-- to apply before MFA adoption is complete. Mirrors the middleware step-up at
-- the RLS layer, closing the gap for direct API access with a stolen aal1 JWT.
-- =============================================================================

-- 1. Helper: does the current session satisfy the caller's MFA posture?
-- =============================================================================

create or replace function public.mfa_aal_satisfied()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    -- Anonymous callers are already denied by the permissive workspace policies.
    when auth.uid() is null then true
    when exists (
      select 1 from auth.mfa_factors
      where user_id = auth.uid()
        and status = 'verified'
    ) then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    else true
  end;
$$;

-- 2. Attach a restrictive policy to every workspace-scoped table, plus
-- workspaces. Restrictive policies AND with the existing permissive ones.
-- NOTE for future migrations: new tables with a workspace_id column should
-- get the same policy (or re-run this block).
-- =============================================================================

do $$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join pg_class pc on pc.relname = c.table_name
    join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = 'public'
    where c.table_schema = 'public'
      and c.column_name = 'workspace_id'
      and pc.relkind = 'r'
      and pc.relrowsecurity
  loop
    execute format(
      'drop policy if exists "MFA-enrolled sessions must be AAL2" on public.%I',
      t.table_name
    );
    execute format(
      'create policy "MFA-enrolled sessions must be AAL2" on public.%I '
      || 'as restrictive for all to authenticated '
      || 'using ((select public.mfa_aal_satisfied())) '
      || 'with check ((select public.mfa_aal_satisfied()))',
      t.table_name
    );
  end loop;

  execute 'drop policy if exists "MFA-enrolled sessions must be AAL2" on public.workspaces';
  execute 'create policy "MFA-enrolled sessions must be AAL2" on public.workspaces '
    || 'as restrictive for all to authenticated '
    || 'using ((select public.mfa_aal_satisfied())) '
    || 'with check ((select public.mfa_aal_satisfied()))';
end $$;
