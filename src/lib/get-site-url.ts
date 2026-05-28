// Resolves the canonical site URL for use in auth email redirects.
// Order of preference:
// 1. NEXT_PUBLIC_SITE_URL              (explicit override — use on Vercel)
// 2. window.location.origin            (client — matches the domain the user is on)
// 3. VERCEL_PROJECT_PRODUCTION_URL     (auto-injected by Vercel for production)
// 4. VERCEL_URL                        (preview deployments)
// 5. http://localhost:3000             (local fallback)

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return normalize(explicit)

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "")
  }

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
