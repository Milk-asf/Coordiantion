-- Billable entries: the atom of the finance system. Each row is a single
-- delivered, chargeable service for a participant, produced from a completed
-- shift, a billable task, an approved travel-with-client claim, or manual entry.
-- They are consumed (and status-stamped) by NDIS claims and bulk invoicing.

create table public.billable_entries (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  staff_id uuid references public.staff(id) on delete set null,
  staff_name text not null default '',
  source text not null default 'manual'
    check (source in ('shift', 'task', 'travel', 'manual')),
  -- Originating shift/task/travel-claim id; used to dedupe on re-sync.
  source_id text,
  service_date date not null,
  charge_item_number text not null default '',
  charge_name text not null default '',
  claim_type text not null default 'direct-service',
  unit text not null default 'hour' check (unit in ('hour', 'each', 'km')),
  quantity numeric(12,2) not null default 0,
  rate numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  gst_code text not null default 'P2',
  gst_amount numeric(12,2) not null default 0,
  description text not null default '',
  status text not null default 'unpaid'
    check (status in ('unpaid', 'draft', 'ndis-draft', 'exported')),
  invoice_id uuid references public.invoices(id) on delete set null,
  claim_period_id uuid references public.claim_periods(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_billable_entries_workspace on public.billable_entries(workspace_id, service_date desc);
create index idx_billable_entries_status on public.billable_entries(workspace_id, status);
create index idx_billable_entries_client on public.billable_entries(workspace_id, client_id);
-- Re-sync dedupe: at most one entry per (source, source_id, charge item).
create unique index idx_billable_entries_dedupe
  on public.billable_entries(workspace_id, source, source_id, charge_item_number)
  where source_id is not null;

alter table public.billable_entries enable row level security;

create policy "Members can view billable entries"
  on public.billable_entries for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert billable entries"
  on public.billable_entries for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update billable entries"
  on public.billable_entries for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete billable entries"
  on public.billable_entries for delete
  using (public.is_workspace_member(workspace_id));
