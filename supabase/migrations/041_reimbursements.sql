-- Reimbursements: staff submit an expense claim with a receipt and it follows
-- the same draft -> sent -> approved/returned review flow as orders/timesheets.

create table public.reimbursements (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default '',
  amount numeric(12,2) not null default 0,
  category text not null default 'other'
    check (category in ('travel', 'meals', 'equipment', 'training', 'phone', 'accommodation', 'other')),
  date_incurred date,
  description text not null default '',
  attachment_name text not null default '',
  attachment_storage_path text not null default '',
  attachment_mime_type text not null default '',
  attachment_size integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'returned', 'approved')),
  review_note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  approved_by uuid references auth.users(id) on delete set null,
  approved_by_name text not null default '',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reimbursements_workspace on public.reimbursements(workspace_id, created_at desc);
create index idx_reimbursements_status on public.reimbursements(workspace_id, status);

alter table public.reimbursements enable row level security;

create policy "Members can view reimbursements"
  on public.reimbursements for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert reimbursements"
  on public.reimbursements for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update reimbursements"
  on public.reimbursements for update
  using (public.is_workspace_member(workspace_id));

create policy "Members can delete reimbursements"
  on public.reimbursements for delete
  using (public.is_workspace_member(workspace_id));
