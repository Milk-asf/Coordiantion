create table public.orders (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  title text not null default '',
  amount numeric(12,2) not null default 0,
  funding_source text not null default 'none' check (funding_source in ('none', 'ndis', 'private', 'other')),
  description text not null default '',
  attachment_name text not null default '',
  attachment_storage_path text not null default '',
  attachment_mime_type text not null default '',
  attachment_size integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'returned', 'approved')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  approved_by uuid references auth.users(id) on delete set null,
  approved_by_name text not null default '',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_workspace on public.orders(workspace_id);
create index idx_orders_client on public.orders(client_id);
create index idx_orders_status on public.orders(workspace_id, status);

alter table public.orders enable row level security;

create policy "Members can view orders"
  on public.orders for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert orders"
  on public.orders for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update orders"
  on public.orders for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete orders"
  on public.orders for delete
  using (public.is_workspace_member(workspace_id));
