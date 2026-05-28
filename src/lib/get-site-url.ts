// Resolves the canonical site URL for use in auth email redirects.
//
// On the client we ALWAYS prefer window.location.origin so the redirect
// matches the exact domain the user is currently on (prod, preview, or
// localhost). This avoids a stale/incorrect NEXT_PUBLIC_SITE_URL value
// being baked into the client bundle at build time.
//
// On the server (route handlers) there is no window, so we fall back to
// explicit/auto-injected env vars.
//
// Order of preference:
// 1. window.location.origin            (client — matches the live domain)
// 2. NEXT_PUBLIC_SITE_URL              (server — explicit override)
// 3. VERCEL_PROJECT_PRODUCTION_URL     (server — Vercel production)
// 4. VERCEL_URL                        (server — Vercel preview)
// 5. http://localhost:3000             (local fallback)

export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "")
  }

  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return normalize(explicit)

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProduction) return normalize(vercelProduction)

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return normalize(vercelUrl)

  return "http://localhost:3000"
}

/** Build the Supabase auth callback URL with an optional post-auth redirect path. */
export function getAuthCallbackUrl(next = "/onboarding"): string {
  const base = `${getSiteUrl()}/auth/callback`
  if (!next) return base
  return `${base}?next=${encodeURIComponent(next)}`
}

function normalize(raw: string): string {
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`
  return withProtocol.replace(/\/$/, "")
}
