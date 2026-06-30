-- Track NDIA payment status per claim period. After a bulk payment request is
-- submitted to the portal and paid, finance flips this to 'paid' to track which
-- claims have been processed.

alter table public.claim_periods
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid'));

create index if not exists idx_claim_periods_payment
  on public.claim_periods(workspace_id, payment_status);
