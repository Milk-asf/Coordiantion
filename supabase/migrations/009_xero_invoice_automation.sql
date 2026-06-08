-- =============================================================================
-- Migration 009: Xero invoice automation settings
-- Adds per-connection toggles controlling whether invoices are automatically
-- pushed to Xero when sent, and whether a "Pay now" button (Xero hosted online
-- invoice link) is included on the invoice email + PDF.
-- Depends on migration 007 (integration_connections) and 008 (mapping settings).
-- =============================================================================

alter table public.integration_connections
  -- When true, sending an invoice also creates it in Xero automatically.
  add column if not exists auto_push_invoices boolean not null default false,
  -- When true, invoices include a "Pay now" button linking to the Xero hosted
  -- online invoice. Requires the invoice to be pushed to Xero first.
  add column if not exists include_pay_now boolean not null default false;
