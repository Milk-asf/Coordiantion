-- =============================================================================
-- Migration 005: Persisted per-charge configuration
-- Stores the full charge item objects (incl. GST treatment, price, claim type)
-- instead of only the enabled item numbers, so per-charge GST is editable and
-- survives reloads.
-- =============================================================================

alter table public.charges_config
  add column if not exists charge_items jsonb not null default '[]'::jsonb;
