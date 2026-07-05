# Enterprise readiness

How Coordination meets the requirements enterprise and government-funded (NDIS)
organisations typically assess: authentication, auditability, data protection,
availability, and operations. Companion documents: [SECURITY.md](../SECURITY.md)
for the security policy and [README.md](../README.md) for setup.

## Authentication & access

### Roles

Access is role-based with four roles enforced in the UI **and** in Postgres
row-level security: `super-admin`, `admin`, `coordinator`, `support-worker`.
Support workers see only their roster, incidents, and assigned participants.

### Two-factor authentication (TOTP)

- Any user can enrol an authenticator app under **Settings → Security**.
- Users with an enrolled factor must complete the 6-digit challenge at every
  sign-in before the session is upgraded to AAL2; the middleware blocks the
  app until then (`src/lib/supabase/middleware.ts`).
- Super-admins can turn on **Require two-factor for everyone**
  (Settings → Security). Members without a factor are then routed into
  enrolment before they can use the dashboard.
- **Data-layer enforcement**: restrictive RLS policies
  (`supabase/migrations/059_mfa_aal2_policies.sql`) deny reads and writes to
  any MFA-enrolled user whose session is not AAL2 — a stolen password-only
  token cannot touch data even if it bypasses the app. Users without factors
  are unaffected, so the policy is safe before rollout completes.

### Single sign-on (SSO)

The app ships with an SSO sign-in flow at `/login/sso` ("Use single sign-on"
on the login page): users enter their work email and are redirected to their
organisation's identity provider via `signInWithSSO`.

Auth is Supabase Auth, which supports **SAML 2.0 SSO** (Okta, Entra ID,
Google Workspace, etc.) on the Supabase Pro plan and above. Activating a
customer's IdP is configuration, not code:

1. Supabase Dashboard → Authentication → SSO → add the identity provider's
   metadata URL and map the email domain.
2. Register the Supabase ACS URL and entity ID with the IdP.
3. Users on that domain can then sign in through `/login/sso`.

Session lifetime, refresh-token rotation, and password policy are also managed
in Supabase Auth settings.

## Audit logging

Every insert, update, and delete on workspace data is recorded by database
triggers (`supabase/migrations/057_audit_log.sql`) — the trail captures writes
from the app, API routes, and server-side automation alike.

- **Captured**: actor (user id, email, JWT role), action, table, record id,
  timestamp, and the changed fields (before/after for updates, full row for
  creates/deletes).
- **Redacted**: encrypted integration tokens and other secret-bearing columns
  never enter the log.
- **Immutable**: no API write path exists; only the database trigger inserts
  rows, and RLS restricts reads to workspace admins.
- **Viewer**: Settings → Audit log (admins only), with action/type/period
  filters and before/after inspection.
- **Retention**: `select public.purge_audit_log(365)` deletes entries older
  than N days; schedule it with `pg_cron` or the Supabase dashboard to match
  your retention policy. NDIS practice standards generally expect 7 years for
  incident-related records — align retention before enabling automatic purges.

## Data protection

- **Tenant isolation**: every table is scoped to a workspace and protected by
  Postgres RLS; helper functions (`is_workspace_member`, `is_workspace_admin`)
  gate all reads and writes.
- **Encryption in transit**: TLS everywhere; HSTS with a two-year max-age.
- **Encryption at rest**: Supabase encrypts the database at rest (AES-256);
  third-party integration tokens are additionally encrypted at the application
  layer with AES-256-GCM before storage (`src/lib/crypto/secure-store.ts`).
- **Browser hardening**: Content-Security-Policy, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers are
  set globally in `next.config.ts`. Set `CSP_REPORT_ONLY=true` to trial policy
  changes without enforcement.
- **Input validation**: API routes validate input with Zod, authenticate the
  caller, verify workspace role, and rate-limit per user
  (`src/lib/rate-limit.ts`).
- **Rate limiting**: shared across all server instances when Upstash Redis is
  configured (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`); otherwise
  per-instance in memory. Redis outages fail open rather than blocking users.
- **Data portability**: workspace admins can download all workspace data as a
  single JSON file (Settings → General → Data Export, backed by
  `GET /api/export` and `supabase/migrations/060_workspace_export.sql`).
  Encrypted integration credentials are never included.

## Availability & operations

- **Hosting**: Vercel (app) and Supabase (Postgres, auth, storage) — managed,
  single-tenant infrastructure.
- **Health probe**: `GET /api/health` is unauthenticated and returns overall
  status plus a database reachability check (`200` healthy / `503` degraded).
  Point uptime monitors (Better Stack, Pingdom, StatusCake) at it.
- **Backups / disaster recovery**: Supabase takes daily automated backups on
  Pro; enable Point-in-Time Recovery for a recovery point objective of
  ~2 minutes. Restores are performed from the Supabase dashboard.
- **Fail-fast configuration**: the server validates environment configuration
  on boot (`src/instrumentation.ts`) and refuses to start in production if
  core credentials are missing or malformed.
- **Error monitoring**: uncaught server errors (renders, routes, server
  actions) are captured by Next's `onRequestError` hook and emitted as
  structured JSON logs (`src/lib/error-reporting.ts`); set `ERROR_WEBHOOK_URL`
  to also deliver them to Slack/Better Stack/any collector. Swapping in Sentry
  is a one-function change.
- **CI**: every push and pull request runs typecheck, lint, unit tests, and a
  production build (`.github/workflows/ci.yml`).

## Subprocessors

| Provider | Purpose | Data touched |
|----------|---------|--------------|
| Supabase | Database, auth, file storage | All workspace data |
| Vercel   | Application hosting | Requests in transit |
| Resend   | Transactional email (invoices, invites) | Recipient email, invoice PDFs |
| Xero     | Optional accounting integration | Invoices, contacts (when connected) |

Choose Supabase and Vercel regions to satisfy data-residency requirements
(both offer Sydney regions for Australian NDIS data).

## Remaining operational tasks

Everything above is implemented in code. What's left is per-deployment
configuration:

- **SAML SSO** — register each customer's identity provider in the Supabase
  dashboard (Pro plan); the `/login/sso` flow is already live.
- **Audit retention schedule** — schedule `purge_audit_log()` with `pg_cron`
  to match your retention policy.
- **Uptime monitoring** — point a monitor at `GET /api/health`.
- **Error delivery** — set `ERROR_WEBHOOK_URL` (or swap in Sentry inside
  `src/lib/error-reporting.ts`).
- **Distributed rate limiting** — create an Upstash Redis database and set
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` when scaling beyond a
  single region.
- **Point-in-Time Recovery** — enable in the Supabase dashboard (Pro plan).
