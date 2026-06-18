alter table public.roster_shifts
  alter column staff_id drop not null,
  alter column client_id drop not null;

alter table public.roster_shifts
  add constraint roster_shifts_assignee_required
  check (staff_id is not null or client_id is not null);
