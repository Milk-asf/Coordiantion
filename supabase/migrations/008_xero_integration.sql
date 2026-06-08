-- =============================================================================
-- Migration 008: Xero integration support
-- Adds: per-connection invoice mapping settings on integration_connections,
--       and Xero link/status columns on invoices so sent invoices can be
--       tracked back to their Xero record.
-- Depends on migration 007 (integration_connections).
-- =============================================================================

-- 1. Connection-level invoice mapping settings
-- =============================================================================

alter table public.integration_connections
  -- Xero revenue account code applied to invoice line items (Chart of Accounts).
  add column if not exists revenue_account_code text not null default '200',
  -- Xero tax type applied to line items (e.g. 'OUTPUT' GST on income, 'EXEMPTOUTPUT' GST free).
  add column if not exists sales_tax_type text not null default 'EXEMPTOUTPUT';

-- 2. Link invoices to their Xero record + last-known Xero status
-- =============================================================================

alter table public.invoices
  add column if not exists xero_invoice_id text,
  add column if not exists xero_status text,
  add column if not exists xero_synced_at timestamptz;

create index if not exists idx_invoices_xero_invoice_id
  on public.invoices (xero_invoice_id);
