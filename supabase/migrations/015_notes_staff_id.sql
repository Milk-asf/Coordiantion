alter table public.notes
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

create index if not exists idx_notes_staff
  on public.notes(workspace_id, staff_id);
