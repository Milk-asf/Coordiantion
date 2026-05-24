# Coordination

NDIS support coordination management platform built with Next.js, Supabase, and Tailwind CSS.

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- (Optional) A [Resend](https://resend.com) account for invoice emails

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd Coordiantion
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (keep secret) |
| `RESEND_API_KEY` | (Optional) Resend dashboard → API Keys |
| `RESEND_FROM_EMAIL` | (Optional) Your verified sender address in Resend |

### 3. Set up the database

Run the migration against your Supabase project. You can do this via the SQL Editor in the Supabase Dashboard:

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

Or use the Supabase CLI:

```bash
npx supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### 4. Configure Auth

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### 5. (Optional) Seed sample data

To populate your workspace with sample clients, contacts, and tasks:

```bash
node supabase/seed.mjs
```

This requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to be set in `.env.local`.

### 6. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Create an account and you'll be set up with a workspace automatically.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, password reset
│   ├── (dashboard)/     # Main app pages (tasks, clients, invoicing, etc.)
│   ├── (settings)/      # Workspace settings
│   ├── api/             # API routes (email, PDF, invites)
│   └── auth/            # OAuth callback handler
├── components/          # Shared UI components
└── lib/
    ├── hooks/           # Data-fetching hooks
    ├── supabase/        # Supabase client setup
    └── *-context.tsx    # React context providers
```

## Key Features

- **Task Management** — Track coordinator tasks with assignees, due dates, and charge items
- **Client Profiles** — Full participant details, NDIS plans, budgets, and activity logs
- **Invoicing** — Generate, review, and send NDIS invoices via email or portal claim
- **Notes** — Rich text notes linked to clients, contacts, or staff
- **Documents** — File upload and folder management
- **Team** — Invite members, assign roles (super-admin, admin, coordinator)
- **Contacts & Staff** — Manage participant contacts and your support team

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **Email**: Resend
- **PDF**: @react-pdf/renderer

## Troubleshooting

**"Supabase is not configured" on login page**
→ Check that `.env.local` has valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values.

**Redirect loops after signup**
→ Ensure your Supabase Auth redirect URL includes `http://localhost:3000/auth/callback`.

**Invites not working**
→ The `SUPABASE_SERVICE_ROLE_KEY` must be set for the invite API route to function.

**Invoices not sending**
→ Set `RESEND_API_KEY` and verify your sender domain in Resend.
