-- Approved reimbursements can be exported for payment. Track when each one was
-- paid (and by whom) so it drops out of the "to pay" export queue and stays
-- traceable, mirroring how timesheets track invoiced_at.

alter table public.reimbursements
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by_name text not null default '';

create index if not exists idx_reimbursements_paid on public.reimbursements(workspace_id, paid_at);
