-- =============================================================================
-- Migration 061: Custom list kanban stage colours
-- Per-stage chip colour overrides (stage label -> palette key). Stages without
-- an entry keep the automatic colour derived from their label.
-- =============================================================================

alter table public.custom_lists
  add column if not exists kanban_stage_colors jsonb;
