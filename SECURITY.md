# Security Policy

This document describes how Coordination handles sensitive data, controls access, and
responds to incidents. It is aligned with the
[Xero developer partner security requirements](https://developer.xero.com/partner/security-requirements-for-developer-partners)
so that connecting an accounting integration (e.g. Xero) meets partner obligations.

## Reporting a vulnerability or breach

If you discover a security vulnerability, or suspect a breach that may expose customer
data, credentials, or integration tokens, email **security@coordination.app** immediately.
Please do not disclose the issue publicly until it has been investigated and resolved.

For breaches involving Xero data, public/private key certificates, tokens, or other
sensitive details, we will also notify Xero immediately at **api@xero.com**, as required
of certified developer partners.

## Sensitive data

- Highly sensitive values — third-party integration access/refresh tokens — are
  **encrypted at rest** using AES-256-GCM (`src/lib/crypto/secure-store.ts`) before being
  written to the database. Plaintext tokens are never stored.
- The encryption key (`INTEGRATION_ENCRYPTION_KEY`) is provided via environment variables,
  is never committed to the repository, and is not exposed to the client bundle.
- Integration tokens are stored in `public.integration_connections`, which is restricted to
  workspace admins via row-level security (migration `007_integration_credentials.sql`).
- The Supabase service-role key is server-only and is never shipped to the browser.

## Access control

- Application access is role-based: `super-admin`, `admin`, and `coordinator` roles are
  enforced both in the UI and in the database.
- Postgres **row-level security (RLS)** scopes every table to the user's workspace; helper
  functions (`is_workspace_member`, `is_workspace_admin`, `is_workspace_super_admin`) gate
  reads and writes (see migrations `001`, `002`, and `007`).
- Integration credentials and management actions are limited to workspace admins.
- Operational/production data access is limited to authorised personnel on a
  need-to-know basis.

## Hosting

- The application is hosted on managed, single-tenant cloud infrastructure
  (Vercel for the app, Supabase for the database) — **not** on shared hosting where other
  tenants could access credentials or data.

## SSL / transport security

- All traffic is served over HTTPS (TLS) in production.
- HTTP Strict Transport Security and related hardening headers are configured in
  `next.config.ts` (`Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`).

## Software development practices

- API routes authenticate the caller, verify workspace membership/role, validate input with
  Zod, and apply rate limiting (`src/lib/rate-limit.ts`).
- We follow security best practices for our stack and remain mindful of common web
  vulnerabilities (e.g. the OWASP Top 10).

## Privacy

- A public privacy policy is available at `/privacy` and is reachable without signing in.
