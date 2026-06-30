-- Idempotent fix: apply IN0001 format even if 033 failed partway through.
-- Safe to run in the Supabase SQL editor after a failed 033/034 attempt.

alter table public.incidents
  add column if not exists incident_number text not null default '';

drop index if exists public.idx_incidents_workspace_number_unique;

update public.incidents
set incident_number = '__tmp__' || id::text
where coalesce(incident_number, '') = ''
   or incident_number !~ '^IN\d+$';

with numbered as (
  select
    id,
    row_number() over (
      partition by workspace_id
      order by created_at, id
    ) as rn
  from public.incidents
)
update public.incidents as i
set incident_number = 'IN' || lpad(n.rn::text, 4, '0')
from numbered as n
where i.id = n.id
  and i.incident_number like '__tmp__%';

create unique index if not exists idx_incidents_workspace_number_unique
  on public.incidents (workspace_id, incident_number)
  where incident_number <> '';

drop table if exists public.incident_counters_simple cascade;
drop table if exists public.incident_counters cascade;

create table public.incident_counters (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.incident_counters (workspace_id, last_number)
select
  workspace_id,
  coalesce(max((substring(incident_number from '^IN(\d+)$'))::integer), 0)
from public.incidents
where incident_number ~ '^IN\d+$'
group by workspace_id;

alter table public.incident_counters enable row level security;

drop policy if exists "Admins can view incident counters" on public.incident_counters;
create policy "Admins can view incident counters"
  on public.incident_counters for select
  using (public.is_workspace_admin(workspace_id));

create or replace function public.next_incident_number(ws_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  next_num integer;
begin
  if not public.is_workspace_admin(ws_id) then
    raise exception 'Not authorized to generate incident numbers for this workspace';
  end if;

  insert into public.incident_counters (workspace_id, last_number)
  values (ws_id, 0)
  on conflict (workspace_id) do nothing;

  update public.incident_counters
  set last_number = last_number + 1,
      updated_at = now()
  where workspace_id = ws_id
  returning last_number into next_num;

  return 'IN' || lpad(next_num::text, 4, '0');
end;
$$;

notify pgrst, 'reload schema';
