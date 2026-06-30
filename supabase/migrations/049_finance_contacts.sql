-- Finance contacts: external people/organisations who receive invoices. Kept
-- separate from participants and staff; assignable as a client's invoice
-- recipient or per-line "Send To" target when generating invoices.

create table public.finance_contacts (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null default 'person' check (type in ('person', 'company')),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  abn text not null default '',
  address text not null default '',
  bsb text not null default '',
  account_number text not null default '',
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_finance_contacts_workspace on public.finance_contacts(workspace_id, created_at desc);

alter table public.finance_contacts enable row level security;

create policy "Members can view finance contacts"
  on public.finance_contacts for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert finance contacts"
  on public.finance_contacts for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update finance contacts"
  on public.finance_contacts for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete finance contacts"
  on public.finance_contacts for delete
  using (public.is_workspace_member(workspace_id));
