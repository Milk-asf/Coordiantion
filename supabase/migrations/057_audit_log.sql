-- =============================================================================
-- Migration 057: Audit logging
-- Immutable, workspace-scoped audit trail captured by database triggers so
-- every write path (app, API routes, service role, SQL) is recorded.
-- Admins can read their workspace's trail; nothing can write to it through
-- the API — rows are inserted only by the trigger function below.
-- =============================================================================

-- 1. Audit log table
-- =============================================================================

create table public.audit_log (
  id bigint generated always as identity primary key,
  -- Intentionally no FK to workspaces: the trail must survive workspace
  -- deletion (and the DELETE trigger on workspaces itself needs to insert
  -- a row after the workspace is gone). Use purge_audit_log() for retention.
  workspace_id uuid not null,
  actor_id uuid,
  actor_email text,
  -- JWT role of the caller: 'authenticated' for users, 'service_role' for
  -- server-side automation (invites, webhooks), null for direct SQL.
  actor_role text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  record_id text,
  -- INSERT: new_data = full row. DELETE: old_data = full row.
  -- UPDATE: old_data/new_data hold only the columns that changed.
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_workspace_created
  on public.audit_log (workspace_id, created_at desc);

create index idx_audit_log_record
  on public.audit_log (workspace_id, table_name, record_id);

alter table public.audit_log enable row level security;

create policy "Admins can read audit log"
  on public.audit_log for select
  using (public.is_workspace_admin(workspace_id));

-- No insert/update/delete policies: the log is append-only via the
-- security-definer trigger and immutable from the API. Revoke the default
-- grants as well so RLS is not the only line of defence.
revoke insert, update, delete on public.audit_log from anon, authenticated;

-- 2. Trigger function
-- =============================================================================

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  changed_old jsonb;
  changed_new jsonb;
  ws_id uuid;
  rec_id text;
  -- Secrets never belong in the audit trail, even encrypted.
  redacted_columns text[] := array[
    'access_token_encrypted',
    'refresh_token_encrypted',
    'password',
    'secret',
    'api_key'
  ];
  col text;
begin
  if tg_op in ('UPDATE', 'DELETE') then old_row := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then new_row := to_jsonb(new); end if;

  -- Skip no-op updates so the trail stays meaningful.
  if tg_op = 'UPDATE' and old_row = new_row then
    return null;
  end if;

  foreach col in array redacted_columns loop
    old_row := old_row - col;
    new_row := new_row - col;
  end loop;

  if tg_table_name = 'workspaces' then
    ws_id := coalesce(new_row ->> 'id', old_row ->> 'id')::uuid;
  else
    ws_id := coalesce(new_row ->> 'workspace_id', old_row ->> 'workspace_id')::uuid;
  end if;

  -- Tables keyed on workspace_id (e.g. workspace_settings) have no id column.
  rec_id := coalesce(
    coalesce(new_row ->> 'id', old_row ->> 'id'),
    coalesce(new_row ->> 'workspace_id', old_row ->> 'workspace_id')
  );

  -- Rows without a workspace can't be scoped for RLS reads; don't log them.
  if ws_id is null then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(o.key, o.value), '{}'::jsonb)
      into changed_old
      from jsonb_each(old_row) o
      where new_row -> o.key is distinct from o.value;

    select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb)
      into changed_new
      from jsonb_each(new_row) n
      where old_row -> n.key is distinct from n.value;
  end if;

  insert into public.audit_log
    (workspace_id, actor_id, actor_email, actor_role, action, table_name, record_id, old_data, new_data)
  values (
    ws_id,
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() ->> 'role', ''),
    tg_op,
    tg_table_name,
    rec_id,
    case tg_op when 'UPDATE' then changed_old when 'DELETE' then old_row end,
    case tg_op when 'UPDATE' then changed_new when 'INSERT' then new_row end
  );

  return null;
end;
$$;

-- 3. Attach the trigger to every workspace-scoped table, plus workspaces.
-- NOTE for future migrations: new tables with a workspace_id column should
-- add the same trigger (or re-run this block).
-- =============================================================================

do $$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema
      and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'workspace_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name <> 'audit_log'
  loop
    execute format('drop trigger if exists audit_trigger on public.%I', t.table_name);
    execute format(
      'create trigger audit_trigger after insert or update or delete on public.%I for each row execute function public.audit_trigger()',
      t.table_name
    );
  end loop;

  execute 'drop trigger if exists audit_trigger on public.workspaces';
  execute 'create trigger audit_trigger after insert or update or delete on public.workspaces for each row execute function public.audit_trigger()';
end $$;

-- 4. Retention
-- =============================================================================

create or replace function public.purge_audit_log(retention_days integer default 365)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  removed bigint;
begin
  delete from public.audit_log
  where created_at < now() - make_interval(days => retention_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Only operators (service role / scheduled jobs) may purge; never end users.
revoke execute on function public.purge_audit_log(integer) from public, anon, authenticated;
