-- =============================================================================
-- Migration 060: Workspace data export
-- Self-service export of all workspace data as JSON, for portability requests
-- and offboarding. Admin-only, enforced inside the function itself.
-- =============================================================================

create or replace function public.export_workspace_json(ws_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  t record;
  rows jsonb;
begin
  if not public.is_workspace_admin(ws_id) then
    raise exception 'Only workspace admins can export workspace data';
  end if;

  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema
      and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'workspace_id'
      and tb.table_type = 'BASE TABLE'
      -- audit_log is queryable separately and can be very large;
      -- integration_connections holds encrypted credentials, not business data.
      and c.table_name not in ('audit_log', 'integration_connections')
    order by c.table_name
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.workspace_id = $1',
      t.table_name
    ) into rows using ws_id;
    result := result || jsonb_build_object(t.table_name, rows);
  end loop;

  result := result || jsonb_build_object(
    'workspace',
    (select to_jsonb(w) from public.workspaces w where w.id = ws_id)
  );

  return jsonb_build_object(
    'format', 'coordination-workspace-export.v1',
    'exported_at', now(),
    'workspace_id', ws_id,
    'data', result
  );
end;
$$;

revoke execute on function public.export_workspace_json(uuid) from public, anon;
grant execute on function public.export_workspace_json(uuid) to authenticated;
