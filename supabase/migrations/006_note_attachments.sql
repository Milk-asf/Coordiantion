-- =============================================================================
-- Migration 006: Note attachments
-- Adds a jsonb column to store uploaded file attachments on notes. Files
-- themselves live in the existing private "documents" storage bucket; this
-- column persists their metadata (id, name, size, storagePath, url).
-- =============================================================================

alter table public.notes
  add column if not exists attachments jsonb not null default '[]'::jsonb;
