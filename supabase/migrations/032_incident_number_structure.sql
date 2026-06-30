-- Upgrade flat incident numbers (INC-0001) to structured INC-YYYY-NNNN

alter table public.incident_counters
  add column if not exists counter_year integer;

update public.incident_counters
set counter_year = extract(year from timezone('utc', now()))::integer
where counter_year is null;

alter table public.incident_counters
  alter column counter_year set not null;

alter table public.incident_counters
  drop constraint if exists incident_counters_pkey;

alter table public.incident_counters
  add primary key (workspace_id, counter_year);

-- Reformat legacy flat numbers using each incident's recording year
update public.incidents
set incident_number = 'INC-' || extract(year from created_at)::text || '-' || lpad(
  (substring(incident_number from '^INC-(\d+)$'))::text,
  4,
  '0'
)
where incident_number ~ '^INC-\d+$'
  and incident_number !~ '^INC-\d{4}-\d+$';

-- Assign numbers to any still-empty rows
with numbered as (
  select
    id,
    workspace_id,
    extract(year from created_at)::integer as counter_year,
    row_number() over (
      partition by workspace_id, extract(year from created_at)::integer
      order by created_at, id
    ) as rn
  from public.incidents
  where coalesce(incident_number, '') = ''
)
update public.incidents as i
set incident_number = 'INC-' || n.counter_year::text || '-' || lpad(n.rn::text, 4, '0')
from numbered as n
where i.id = n.id;

insert into public.incident_counters (workspace_id, counter_year, last_number)
select
  workspace_id,
  (substring(incident_number from '^INC-(\d{4})-'))::integer as counter_year,
  coalesce(max((substring(incident_number from '^INC-\d{4}-(\d+)$'))::integer), 0)
from public.incidents
where incident_number ~ '^INC-\d{4}-\d+$'
group by workspace_id, (substring(incident_number from '^INC-(\d{4})-'))::integer
on conflict (workspace_id, counter_year) do update
  set last_number = greatest(incident_counters.last_number, excluded.last_number),
      updated_at = now();

create or replace function public.next_incident_number(ws_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  current_year integer := extract(year from timezone('utc', now()))::integer;
  next_num integer;
begin
  if not public.is_workspace_admin(ws_id) then
    raise exception 'Not authorized to generate incident numbers for this workspace';
  end if;

  insert into public.incident_counters (workspace_id, counter_year, last_number)
  values (ws_id, current_year, 0)
  on conflict (workspace_id, counter_year) do nothing;

  update public.incident_counters
  set last_number = last_number + 1,
      updated_at = now()
  where workspace_id = ws_id
    and counter_year = current_year
  returning last_number into next_num;

  return 'INC-' || current_year::text || '-' || lpad(next_num::text, 4, '0');
end;
$$;

notify pgrst, 'reload schema';
