interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key)
  }
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + config.windowMs })
    return { success: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetIn: entry.resetTime - now }
  }

  entry.count++
  return { success: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetTime - now }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetIn / 1000)),
  }
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ""), token }
}

/**
 * Rate limit check for API routes. Uses Upstash Redis (fixed window, shared
 * across all serverless instances/regions) when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set; otherwise falls back to the per-instance
 * in-memory limiter above. Redis outages fail open to the in-memory limiter —
 * an unavailable limiter should degrade protection, not availability.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const upstash = getUpstashConfig()
  if (!upstash) return rateLimit(identifier, config)

  const key = `rl:${identifier}`
  try {
    const res = await fetch(`${upstash.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstash.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        // Start the window on the first hit only (NX = don't extend it).
        ["PEXPIRE", key, String(config.windowMs), "NX"],
        ["PTTL", key],
      ]),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`)

    const results = (await res.json()) as Array<{ result?: unknown; error?: string }>
    const count = Number(results[0]?.result)
    const ttl = Number(results[2]?.result)
    if (!Number.isFinite(count)) {
      throw new Error(results[0]?.error ?? "Unexpected Upstash response")
    }

    const resetIn = Number.isFinite(ttl) && ttl > 0 ? ttl : config.windowMs
    if (count > config.maxRequests) {
      return { success: false, remaining: 0, resetIn }
    }
    return { success: true, remaining: config.maxRequests - count, resetIn }
  } catch (error) {
    console.warn(
      `[rate-limit] Redis unavailable, using in-memory fallback: ${error instanceof Error ? error.message : error}`
    )
    return rateLimit(identifier, config)
  }
}
