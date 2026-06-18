alter table public.roster_shifts
  add column if not exists charge_types jsonb not null default '[]'::jsonb;

update public.roster_shifts
set charge_types = jsonb_build_array(charge_type)
where charge_type is not null
  and charge_type <> ''
  and charge_types = '[]'::jsonb;
