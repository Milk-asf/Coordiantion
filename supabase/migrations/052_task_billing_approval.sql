-- Quality-check gate for billable work. A completed task with a charge is held as
-- 'none' (pending) until an admin approves it in the unified Approvals inbox, at
-- which point it can flow into billable entries / invoices.

alter table public.tasks
  add column if not exists billing_approval text not null default 'none'
    check (billing_approval in ('none', 'approved', 'rejected'));

create index if not exists idx_tasks_billing_approval
  on public.tasks(workspace_id, billing_approval);
