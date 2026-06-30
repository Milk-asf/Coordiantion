-- Track when an approved timesheet has been pushed to invoicing so it leaves
-- the billing queue and links back to the invoice it was rolled into.

alter table public.timesheets
  add column if not exists invoiced_at timestamptz,
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create index if not exists idx_timesheets_invoiced
  on public.timesheets(workspace_id, status, invoiced_at);
