// Resolves the canonical site URL for use in auth email redirects.
// Order of preference:
// 1. window.location.origin            (client — always matches the domain the user is on)
// 2. NEXT_PUBLIC_SITE_URL              (explicit override, e.g. https://app.example.com)
// 3. VERCEL_PROJECT_PRODUCTION_URL     (auto-injected by Vercel for the production deployment)
// 4. http://localhost:3000             (local fallback)

export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "")
  }

  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return normalize(explicit)

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return normalize(vercel)

  return "http://localhost:3000"
}

function normalize(raw: string): string {
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`
  return withProtocol.replace(/\/$/, "")
}
