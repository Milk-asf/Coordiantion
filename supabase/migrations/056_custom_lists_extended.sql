-- Extended custom list fields used by the lists feature (membership, kanban stages, custom column values).

alter table public.custom_lists
  add column if not exists record_ids jsonb not null default '[]'::jsonb,
  add column if not exists kanban_stages jsonb,
  add column if not exists kanban_record_stages jsonb,
  add column if not exists custom_values jsonb not null default '{}'::jsonb;
