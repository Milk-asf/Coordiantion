-- Allow members to pin custom lists. Pinned lists sort to the top of the
-- sidebar "Lists" group and the lists index page.

alter table public.custom_lists
  add column if not exists pinned boolean not null default false;
