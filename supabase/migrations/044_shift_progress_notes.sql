-- NDIS progress (shift) notes: each rostered shift can hold one structured
-- progress note recording the support delivered, goal progress, observations,
-- concerns/incidents, follow-up actions, author and signature. Stored as JSONB
-- on the shift since it is a one-to-one record of a delivered support session.

alter table public.roster_shifts
  add column if not exists progress_note jsonb;
