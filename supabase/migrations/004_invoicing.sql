-- =============================================================================
-- Migration 004: Invoicing improvements
-- Adds: server-side sequential numbering, void/credit-note lifecycle,
--       stored PDF + org snapshot, send-message id, locked-delete RLS,
--       and a private storage bucket for invoice PDFs.
-- =============================================================================

-- 1. Per-workspace invoice counter + atomic number generator
-- =============================================================================

create table if not exists public.invoice_counters (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.invoice_counters enable row level security;

drop policy if exists "Members can view invoice counters" on public.invoice_counters;
create policy "Members can view invoice counters"
  on public.invoice_counters for select
  using (public.is_workspace_member(workspace_id));

-- Atomically increments and returns the next INV-#### for a workspace.
-- security definer so it can write the counter row under RLS; gated to admins.
create or replace function public.next_invoice_number(ws_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  next_num integer;
begin
  if not public.is_workspace_admin(ws_id) then
    raise exception 'Not authorized to generate invoice numbers for this workspace';
  end if;

  insert into public.invoice_counters (workspace_id, last_number)
  values (ws_id, 0)
  on conflict (workspace_id) do nothing;

  update public.invoice_counters
  set last_number = last_number + 1,
      updated_at = now()
  where workspace_id = ws_id
  returning last_number into next_num;

  return 'INV-' || lpad(next_num::text, 4, '0');
end;
$$;

-- Backfill counters from the highest existing INV-#### per workspace
insert into public.invoice_counters (workspace_id, last_number)
select workspace_id,
       coalesce(max((substring(invoice_number from '^INV-(\d+)$'))::int), 0)
from public.invoices
where invoice_number ~ '^INV-\d+$'
group by workspace_id
on conflict (workspace_id) do update set last_number = excluded.last_number;

-- 2. Unique invoice numbers per workspace
-- =============================================================================

create unique index if not exists idx_invoices_workspace_number_unique
  on public.invoices (workspace_id, invoice_number);

-- 3. New lifecycle / audit columns + 'void' status
-- =============================================================================

alter table public.invoices
  add column if not exists kind text not null default 'invoice'
    check (kind in ('invoice', 'credit-note')),
  add column if not exists credit_of uuid references public.invoices(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists org_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists pdf_path text,
  add column if not exists sent_message_id text;

alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check
  check (status in ('unsent', 'sent', 'paid', 'overdue', 'void'));

-- 4. Lock issued invoices: only 'unsent' rows may be deleted
-- =============================================================================

drop policy if exists "Members can delete invoices" on public.invoices;
drop policy if exists "Admins can delete invoices" on public.invoices;

create policy "Admins can delete unsent invoices"
  on public.invoices for delete
  using (public.is_workspace_admin(workspace_id) and status = 'unsent');

-- 5. Private storage bucket for rendered invoice PDFs
--    Object paths are prefixed with the workspace id: {workspace_id}/{file}.pdf
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

drop policy if exists "Workspace members can read invoice pdfs" on storage.objects;
create policy "Workspace members can read invoice pdfs"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Workspace admins can upload invoice pdfs" on storage.objects;
create policy "Workspace admins can upload invoice pdfs"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Workspace admins can update invoice pdfs" on storage.objects;
create policy "Workspace admins can update invoice pdfs"
  on storage.objects for update
  using (
    bucket_id = 'invoices'
    and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Workspace admins can delete invoice pdfs" on storage.objects;
create policy "Workspace admins can delete invoice pdfs"
  on storage.objects for delete
  using (
    bucket_id = 'invoices'
    and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  );

-- 6. Seed a counter row for new workspaces
-- =============================================================================

create or replace function public.create_workspace_for_user(workspace_name text, owner_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  if auth.uid() is not null and auth.uid() != owner_id then
    raise exception 'Cannot create workspace for another user';
  end if;

  if not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Invalid user ID';
  end if;

  insert into public.workspaces (name, created_by)
  values (workspace_name, owner_id)
  returning id into new_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_id, owner_id, 'super-admin', 'active');

  insert into public.workspace_settings (workspace_id)
  values (new_id);

  insert into public.charges_config (workspace_id)
  values (new_id);

  insert into public.field_config (workspace_id)
  values (new_id);

  insert into public.invoice_counters (workspace_id, last_number)
  values (new_id, 0);

  return new_id;
end;
$$;
