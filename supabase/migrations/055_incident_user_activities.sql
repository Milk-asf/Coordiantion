-- Participant activities at the time of the incident

alter table public.incidents
  add column if not exists user_activities text not null default '';
