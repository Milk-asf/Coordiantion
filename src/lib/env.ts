type Env = Record<string, string | undefined>

export interface EnvCheckResult {
  /** Fatal misconfiguration — the app cannot serve users. */
  errors: string[]
  /** Degraded features — the app runs, but something is off. */
  warnings: string[]
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Validates runtime configuration. Pure so it can be unit tested; the
 * production entry point is assertEnv() below, called from instrumentation.ts
 * when the server boots.
 */
export function checkEnv(env: Env = process.env): EnvCheckResult {
  const errors: string[] = []
  const warnings: string[] = []

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !isHttpUrl(supabaseUrl)) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is missing or not a valid URL")
  }
  if (!supabaseAnonKey || supabaseAnonKey.length <= 20) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or malformed")
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY is not set — team invites will not work")
  }
  if (!env.NEXT_PUBLIC_SITE_URL) {
    warnings.push("NEXT_PUBLIC_SITE_URL is not set — auth email redirects fall back to the deployment URL")
  }

  if (env.RESEND_API_KEY && !env.RESEND_FROM_EMAIL) {
    warnings.push("RESEND_API_KEY is set but RESEND_FROM_EMAIL is missing — invoice emails will fail")
  }

  const xeroVars = ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET", "XERO_REDIRECT_URI"] as const
  const xeroSet = xeroVars.filter((name) => env[name])
  if (xeroSet.length > 0 && xeroSet.length < xeroVars.length) {
    const missing = xeroVars.filter((name) => !env[name]).join(", ")
    warnings.push(`Xero is partially configured — missing ${missing}`)
  }
  if (xeroSet.length > 0 && !env.INTEGRATION_ENCRYPTION_KEY) {
    warnings.push("Xero is configured but INTEGRATION_ENCRYPTION_KEY is missing — tokens cannot be stored")
  }

  const upstashVars = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const
  const upstashSet = upstashVars.filter((name) => env[name])
  if (upstashSet.length === 1) {
    const missing = upstashVars.filter((name) => !env[name]).join(", ")
    warnings.push(`Distributed rate limiting is partially configured — missing ${missing}; falling back to in-memory`)
  }

  if (env.ERROR_WEBHOOK_URL && !isHttpUrl(env.ERROR_WEBHOOK_URL)) {
    warnings.push("ERROR_WEBHOOK_URL is not a valid URL — error reports will not be delivered")
  }

  if (env.INTEGRATION_ENCRYPTION_KEY) {
    let keyBytes = 0
    try {
      keyBytes = Buffer.from(env.INTEGRATION_ENCRYPTION_KEY, "base64").length
    } catch {
      keyBytes = 0
    }
    if (keyBytes !== 32) {
      errors.push("INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key")
    }
  }

  return { errors, warnings }
}

/**
 * Fail fast on boot: in production a fatal misconfiguration throws so the
 * problem surfaces at deploy time, not as broken logins hours later. In
 * development everything is logged but the server still starts.
 */
export function assertEnv(env: Env = process.env) {
  const { errors, warnings } = checkEnv(env)

  for (const warning of warnings) {
    console.warn(`[env] ${warning}`)
  }

  if (errors.length === 0) return

  const message = `Invalid environment configuration:\n${errors.map((e) => `  - ${e}`).join("\n")}`
  if (env.NODE_ENV === "production") {
    throw new Error(message)
  }
  console.warn(`[env] ${message}`)
}
