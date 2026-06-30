-- Link reimbursements to an optional participant and roster shift so
-- out-of-pocket expenses can be traced back to the client/shift they relate to.
alter table public.reimbursements
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists client_name text not null default '',
  add column if not exists shift_id uuid references public.roster_shifts(id) on delete set null;

create index if not exists idx_reimbursements_client on public.reimbursements(workspace_id, client_id);
create index if not exists idx_reimbursements_shift on public.reimbursements(workspace_id, shift_id);
