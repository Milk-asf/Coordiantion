-- Report submitted but not yet investigated → sent (replaces draft / not_started)

update public.incidents
set investigation_status = 'sent'
where investigation_status in ('draft', 'not_started');

alter table public.incidents
  drop constraint if exists incidents_investigation_status_check;

alter table public.incidents
  add constraint incidents_investigation_status_check
    check (investigation_status in ('sent', 'in_progress', 'completed', 'closed'));

alter table public.incidents
  alter column investigation_status set default 'sent';
