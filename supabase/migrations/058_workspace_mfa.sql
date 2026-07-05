-- =============================================================================
-- Migration 058: Workspace MFA enforcement
-- Lets a workspace require all members to enrol a second factor (TOTP).
-- Enforcement: users with a verified factor are stepped up to AAL2 by the
-- middleware; when require_mfa is on, members without a factor are routed
-- into enrolment before they can use the app.
-- =============================================================================

alter table public.workspace_settings
  add column if not exists require_mfa boolean not null default false;
