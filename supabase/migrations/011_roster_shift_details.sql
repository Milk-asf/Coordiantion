alter table public.roster_shifts
  add column if not exists title text not null default '',
  add column if not exists session_type text not null default 'support',
  add column if not exists considerations text not null default '';
