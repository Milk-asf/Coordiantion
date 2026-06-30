-- Allow forms to be archived (hidden from the active list without deleting).

alter table public.forms
  add column if not exists archived boolean not null default false;

create index if not exists idx_forms_workspace_archived
  on public.forms(workspace_id, archived);
