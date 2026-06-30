-- Claim periods: a date-range claim run for NDIA-managed participants. Eligible
-- billable line items (invoice line items in range) are pulled in live for
-- review; operators can exclude individual lines or whole participants, then
-- export a portal-ready bulk payment request CSV. Deleting a period never
-- removes the underlying invoices/line items.

create table public.claim_periods (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'exported', 'reconciled')),
  -- Keys excluded from this claim: "<invoiceId>:<lineItemId>" for a single line
  -- or "client:<clientId>" to exclude an entire participant.
  excluded_keys text[] not null default '{}',
  exported_at timestamptz,
  export_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_claim_periods_workspace on public.claim_periods(workspace_id, created_at desc);
create index idx_claim_periods_status on public.claim_periods(workspace_id, status);

alter table public.claim_periods enable row level security;

create policy "Members can view claim periods"
  on public.claim_periods for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert claim periods"
  on public.claim_periods for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update claim periods"
  on public.claim_periods for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete claim periods"
  on public.claim_periods for delete
  using (public.is_workspace_member(workspace_id));
