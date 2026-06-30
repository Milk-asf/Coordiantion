-- Custom forms: form builder definitions, submissions, and process bindings.

create table public.forms (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  name text not null default 'Untitled form',
  description text not null default '',
  icon text not null default '📄',
  icon_color text not null default '#3b82f6',

  schema jsonb not null default '{"fields": [], "steps": []}'::jsonb,
  settings jsonb not null default '{}'::jsonb,

  status text not null default 'draft'
    check (status in ('draft', 'published')),
  tags text[] not null default '{}',
  locked boolean not null default false,
  is_incident_form boolean not null default false,

  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index idx_forms_workspace on public.forms(workspace_id);
create index idx_forms_updated on public.forms(workspace_id, updated_at desc);

alter table public.forms enable row level security;

create policy "Members can view forms"
  on public.forms for select
  using (public.is_workspace_member(workspace_id));

create policy "Admins can insert forms"
  on public.forms for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update forms"
  on public.forms for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete forms"
  on public.forms for delete
  using (public.is_workspace_admin(workspace_id));

create table public.form_submissions (
  id uuid primary key default extensions.uuid_generate_v4(),
  form_id uuid not null references public.forms(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  answers jsonb not null default '{}'::jsonb,
  submitted_by_staff_id uuid references public.staff(id) on delete set null,
  submitted_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_form_submissions_form on public.form_submissions(form_id, created_at desc);
create index idx_form_submissions_workspace on public.form_submissions(workspace_id);

alter table public.form_submissions enable row level security;

create policy "Members can view form submissions"
  on public.form_submissions for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can insert form submissions"
  on public.form_submissions for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update form submissions"
  on public.form_submissions for update
  using (public.is_workspace_member(workspace_id));

create policy "Admins can delete form submissions"
  on public.form_submissions for delete
  using (public.is_workspace_admin(workspace_id));

-- Attach a form to a process (e.g. incident_report). One active form per process per workspace.
create table public.workspace_form_bindings (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  process_key text not null,
  form_id uuid references public.forms(id) on delete set null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, process_key)
);

alter table public.workspace_form_bindings enable row level security;

create policy "Members can view form bindings"
  on public.workspace_form_bindings for select
  using (public.is_workspace_member(workspace_id));

create policy "Admins can upsert form bindings"
  on public.workspace_form_bindings for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update form bindings"
  on public.workspace_form_bindings for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete form bindings"
  on public.workspace_form_bindings for delete
  using (public.is_workspace_admin(workspace_id));
