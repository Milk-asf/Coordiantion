-- Add "not_an_incident" as a valid investigation and incident report status.

alter table public.incidents
  drop constraint if exists incidents_investigation_status_check;

alter table public.incidents
  add constraint incidents_investigation_status_check
    check (investigation_status in ('sent', 'in_progress', 'completed', 'closed', 'not_an_incident'));

alter table public.incidents
  drop constraint if exists incidents_incident_status_check;

alter table public.incidents
  add constraint incidents_incident_status_check
    check (incident_status in ('confirmed', 'alleged', 'not_an_incident'));

notify pgrst, 'reload schema';
