-- Coordination: Initial database schema
-- Run against a fresh Supabase project (Postgres 15+)

-- =============================================================================
-- Extensions
-- =============================================================================
create extension if not exists "uuid-ossp" with schema extensions;

-- =============================================================================
-- Tables
-- =============================================================================

create table public.workspaces (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null default 'coordinator' check (role in ('super-admin', 'admin', 'coordinator')),
  status text not null default 'invited' check (status in ('active', 'pending', 'invited', 'deactivated')),
  invited_email text,
  team text,
  created_at timestamptz not null default now(),
  constraint workspace_members_workspace_user_unique unique (workspace_id, user_id)
);

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  org_name text not null default '',
  org_abn text not null default '',
  ndis_number text not null default '',
  org_phone text not null default '',
  org_email text not null default '',
  org_address text not null default '',
  bank_name text not null default '',
  bank_bsb text not null default '',
  bank_account text not null default '',
  bank_account_name text not null default '',
  logo_url text not null default '',
  primary_color text not null default '',
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default '',
  icon_color text not null default '#6b7280',
  icon_text text not null default '',
  icon_shape text not null default 'square' check (icon_shape in ('square', 'circle')),
  participant jsonb not null default '{}'::jsonb,
  industry text[] not null default '{}',
  status text not null default 'active',
  assigned_to text,
  summary text not null default '',
  about text not null default '',
  owner text not null default '',
  website text not null default '',
  revenue text not null default '',
  headcount text not null default '',
  last_funding text not null default '',
  last_interaction text not null default '',
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  name text not null default '',
  relationship text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default '',
  icon_text text not null default '',
  details jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'invited', 'inactive')),
  invited_email text not null default '',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  assignee text not null default '',
  client_name text not null default '',
  client_id uuid references public.clients(id) on delete set null,
  due_date date,
  attachments jsonb not null default '[]'::jsonb,
  charge_type text not null default '',
  time_spent integer not null default 0,
  secondary_charge_type text not null default '',
  secondary_time_spent integer not null default 0,
  is_check_up boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default '',
  size integer not null default 0,
  mime_type text not null default '',
  storage_path text not null default '',
  folder text not null default '',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_number text not null default '',
  client_name text not null default '',
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'unsent' check (status in ('unsent', 'sent', 'paid', 'overdue')),
  issue_date date,
  due_date date,
  task_ids uuid[] not null default '{}',
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  gst numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text not null default '',
  created_by text not null default '',
  delivery_method text,
  sent_at timestamptz,
  sent_to text,
  sent_error text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.charges_config (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  enabled_charges text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.field_config (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  hidden_fields text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- View: workspace_members_with_profile
-- Joins workspace_members with auth.users to expose name and email
-- =============================================================================

create or replace view public.workspace_members_with_profile as
select
  wm.*,
  coalesce(u.raw_user_meta_data ->> 'full_name', '') as user_full_name,
  coalesce(u.email, '') as user_email
from public.workspace_members wm
left join auth.users u on u.id = wm.user_id;

-- =============================================================================
-- RPC: create_workspace_for_user
-- Creates a workspace and returns its id
-- =============================================================================

create or replace function public.create_workspace_for_user(workspace_name text, owner_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
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

  return new_id;
end;
$$;

-- =============================================================================
-- Indexes
-- =============================================================================

create index idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_workspace_members_email on public.workspace_members(invited_email);
create index idx_clients_workspace on public.clients(workspace_id);
create index idx_contacts_workspace on public.contacts(workspace_id);
create index idx_contacts_client on public.contacts(client_id);
create index idx_staff_workspace on public.staff(workspace_id);
create index idx_tasks_workspace on public.tasks(workspace_id);
create index idx_tasks_client on public.tasks(client_id);
create index idx_tasks_status on public.tasks(workspace_id, status);
create index idx_documents_workspace on public.documents(workspace_id);
create index idx_notes_workspace on public.notes(workspace_id);
create index idx_notes_client on public.notes(client_id);
create index idx_invoices_workspace on public.invoices(workspace_id);
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_status on public.invoices(workspace_id, status);

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.staff enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.notes enable row level security;
alter table public.invoices enable row level security;
alter table public.charges_config enable row level security;
alter table public.field_config enable row level security;

-- Helper: check if current user is an active member of the given workspace
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- Workspaces: users can only see workspaces they are a member of
create policy "Members can view their workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "Members can update their workspaces"
  on public.workspaces for update
  using (public.is_workspace_member(id));

-- Workspace members: users can see/manage members in their workspace
create policy "Members can view workspace members"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert workspace members"
  on public.workspace_members for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update workspace members"
  on public.workspace_members for update
  using (public.is_workspace_member(workspace_id));

-- Workspace settings
create policy "Members can view workspace settings"
  on public.workspace_settings for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can upsert workspace settings"
  on public.workspace_settings for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update workspace settings"
  on public.workspace_settings for update
  using (public.is_workspace_member(workspace_id));

-- Clients
create policy "Members can view clients"
  on public.clients for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert clients"
  on public.clients for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update clients"
  on public.clients for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete clients"
  on public.clients for delete
  using (public.is_workspace_member(workspace_id));

-- Contacts
create policy "Members can view contacts"
  on public.contacts for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert contacts"
  on public.contacts for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update contacts"
  on public.contacts for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete contacts"
  on public.contacts for delete
  using (public.is_workspace_member(workspace_id));

-- Staff
create policy "Members can view staff"
  on public.staff for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert staff"
  on public.staff for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update staff"
  on public.staff for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete staff"
  on public.staff for delete
  using (public.is_workspace_member(workspace_id));

-- Tasks
create policy "Members can view tasks"
  on public.tasks for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert tasks"
  on public.tasks for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update tasks"
  on public.tasks for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete tasks"
  on public.tasks for delete
  using (public.is_workspace_member(workspace_id));

-- Documents
create policy "Members can view documents"
  on public.documents for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert documents"
  on public.documents for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update documents"
  on public.documents for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete documents"
  on public.documents for delete
  using (public.is_workspace_member(workspace_id));

-- Notes
create policy "Members can view notes"
  on public.notes for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert notes"
  on public.notes for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update notes"
  on public.notes for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete notes"
  on public.notes for delete
  using (public.is_workspace_member(workspace_id));

-- Invoices
create policy "Members can view invoices"
  on public.invoices for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert invoices"
  on public.invoices for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update invoices"
  on public.invoices for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete invoices"
  on public.invoices for delete
  using (public.is_workspace_member(workspace_id));

-- Charges config
create policy "Members can view charges config"
  on public.charges_config for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can upsert charges config"
  on public.charges_config for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update charges config"
  on public.charges_config for update
  using (public.is_workspace_member(workspace_id));

-- Field config
create policy "Members can view field config"
  on public.field_config for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can upsert field config"
  on public.field_config for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update field config"
  on public.field_config for update
  using (public.is_workspace_member(workspace_id));

-- =============================================================================
-- Storage buckets
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Storage policies for documents bucket
create policy "Workspace members can upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

create policy "Workspace members can view documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

create policy "Workspace members can delete documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

-- Storage policies for logos bucket (public read, members write)
create policy "Anyone can view logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Workspace members can upload logos"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );
