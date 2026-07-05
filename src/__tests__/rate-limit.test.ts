import { describe, it, expect, vi, afterEach } from "vitest"
import { rateLimit, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

describe("rateLimit", () => {
  it("allows requests within the limit", () => {
    const id = `test-allow-${Date.now()}`
    const config = { maxRequests: 3, windowMs: 10_000 }

    const r1 = rateLimit(id, config)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(id, config)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = rateLimit(id, config)
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it("blocks requests over the limit", () => {
    const id = `test-block-${Date.now()}`
    const config = { maxRequests: 2, windowMs: 10_000 }

    rateLimit(id, config)
    rateLimit(id, config)

    const r3 = rateLimit(id, config)
    expect(r3.success).toBe(false)
    expect(r3.remaining).toBe(0)
    expect(r3.resetIn).toBeGreaterThan(0)
  })

  it("resets after the window expires", async () => {
    const id = `test-reset-${Date.now()}`
    const config = { maxRequests: 1, windowMs: 50 }

    const r1 = rateLimit(id, config)
    expect(r1.success).toBe(true)

    const r2 = rateLimit(id, config)
    expect(r2.success).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 60))

    const r3 = rateLimit(id, config)
    expect(r3.success).toBe(true)
  })

  it("tracks different identifiers independently", () => {
    const config = { maxRequests: 1, windowMs: 10_000 }
    const idA = `test-indep-a-${Date.now()}`
    const idB = `test-indep-b-${Date.now()}`

    const rA = rateLimit(idA, config)
    expect(rA.success).toBe(true)

    const rB = rateLimit(idB, config)
    expect(rB.success).toBe(true)

    const rA2 = rateLimit(idA, config)
    expect(rA2.success).toBe(false)
  })
})

describe("getRateLimitHeaders", () => {
  it("returns correct header values", () => {
    const headers = getRateLimitHeaders({ success: false, remaining: 0, resetIn: 5000 })
    expect(headers["X-RateLimit-Remaining"]).toBe("0")
    expect(headers["X-RateLimit-Reset"]).toBe("5")
  })
})

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const stubUpstash = (response: () => Promise<unknown>) => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token")
    const fetchMock = vi.fn(response)
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("falls back to the in-memory limiter when Redis is not configured", async () => {
    const id = `test-checkrl-memory-${Date.now()}`
    const result = await checkRateLimit(id, { maxRequests: 1, windowMs: 10_000 })
    expect(result.success).toBe(true)
    const second = await checkRateLimit(id, { maxRequests: 1, windowMs: 10_000 })
    expect(second.success).toBe(false)
  })

  it("uses Redis counts when configured", async () => {
    const fetchMock = stubUpstash(async () => ({
      ok: true,
      json: async () => [{ result: 1 }, { result: 1 }, { result: 9_000 }],
    }))

    const result = await checkRateLimit(`test-checkrl-redis-${Date.now()}`, {
      maxRequests: 2,
      windowMs: 10_000,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ success: true, remaining: 1, resetIn: 9_000 })
  })

  it("blocks when the shared count exceeds the limit", async () => {
    stubUpstash(async () => ({
      ok: true,
      json: async () => [{ result: 3 }, { result: 0 }, { result: 4_000 }],
    }))

    const result = await checkRateLimit(`test-checkrl-block-${Date.now()}`, {
      maxRequests: 2,
      windowMs: 10_000,
    })

    expect(result).toEqual({ success: false, remaining: 0, resetIn: 4_000 })
  })

  it("fails open to the in-memory limiter when Redis errors", async () => {
    stubUpstash(async () => {
      throw new Error("connection refused")
    })

    const result = await checkRateLimit(`test-checkrl-failopen-${Date.now()}`, {
      maxRequests: 2,
      windowMs: 10_000,
    })

    expect(result.success).toBe(true)
  })
})
