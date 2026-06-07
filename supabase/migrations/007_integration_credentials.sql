-- =============================================================================
-- Migration 007: Secure third-party integration credentials
-- Adds: a workspace-scoped table for connected providers (e.g. Xero) whose
--       access/refresh tokens are stored ENCRYPTED AT REST by the application
--       (AES-256-GCM via src/lib/crypto/secure-store.ts). Never store plaintext
--       tokens. Access is admin-only and enforced with row-level security.
-- =============================================================================

create table if not exists public.integration_connections (
  id uuid primary key default extensions.uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('xero')),
  -- Ciphertext only. The application encrypts before insert and decrypts on read.
  access_token_encrypted text,
  refresh_token_encrypted text,
  -- Non-secret connection metadata.
  tenant_id text,
  scopes text,
  expires_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create index if not exists idx_integration_connections_workspace
  on public.integration_connections (workspace_id);

alter table public.integration_connections enable row level security;

-- Only workspace admins may view or manage integration connections. Tokens are
-- encrypted regardless, but access to the rows is restricted as defence in depth.
drop policy if exists "Admins can view integration connections" on public.integration_connections;
create policy "Admins can view integration connections"
  on public.integration_connections for select
  using (public.is_workspace_admin(workspace_id));

drop policy if exists "Admins can insert integration connections" on public.integration_connections;
create policy "Admins can insert integration connections"
  on public.integration_connections for insert
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists "Admins can update integration connections" on public.integration_connections;
create policy "Admins can update integration connections"
  on public.integration_connections for update
  using (public.is_workspace_admin(workspace_id));

drop policy if exists "Admins can delete integration connections" on public.integration_connections;
create policy "Admins can delete integration connections"
  on public.integration_connections for delete
  using (public.is_workspace_admin(workspace_id));

-- Keep updated_at current on every write.
create or replace function public.set_integration_connections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_integration_connections_updated_at on public.integration_connections;
create trigger trg_integration_connections_updated_at
  before update on public.integration_connections
  for each row
  execute function public.set_integration_connections_updated_at();
