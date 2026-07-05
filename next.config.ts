import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV !== "production"

const supabaseOrigin = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    return url ? new URL(url).origin : ""
  } catch {
    return ""
  }
})()
// Supabase realtime connects over websockets to the same project host.
const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws")

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode additionally needs eval
  // for react-refresh. wasm-unsafe-eval covers @react-pdf's yoga layout engine.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseWsOrigin}` : ""}${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const securityHeaders = [
  // Set CSP_REPORT_ONLY=true to trial policy changes without blocking anything.
  {
    key: process.env.CSP_REPORT_ONLY === "true"
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
]

const nextConfig: NextConfig = {
  // Keep local `npm run build` from wiping the dev server's `.next` cache (which breaks CSS in dev).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10,
  },
  async redirects() {
    return [
      {
        source: "/invoicing",
        destination: "/business/invoices",
        permanent: false,
      },
      {
        source: "/invoicing/:path*",
        destination: "/business/invoices/:path*",
        permanent: false,
      },
      {
        source: "/business/billables",
        destination: "/settings/charges",
        permanent: false,
      },
      {
        source: "/business/billables/:path*",
        destination: "/settings/charges",
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
