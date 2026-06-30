-- Rename investigation not_started to draft

update public.incidents
set investigation_status = 'draft'
where investigation_status = 'not_started';

alter table public.incidents
  drop constraint if exists incidents_investigation_status_check;

alter table public.incidents
  add constraint incidents_investigation_status_check
    check (investigation_status in ('draft', 'in_progress', 'completed', 'closed'));

alter table public.incidents
  alter column investigation_status set default 'draft';
