import { describe, expect, it } from "vitest"
import { assertEnv, checkEnv } from "@/lib/env"

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(40),
  SUPABASE_SERVICE_ROLE_KEY: "b".repeat(40),
  NEXT_PUBLIC_SITE_URL: "https://app.example.com",
}

describe("checkEnv", () => {
  it("passes a fully configured environment", () => {
    const result = checkEnv(validEnv)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it("flags missing supabase credentials as errors", () => {
    const result = checkEnv({})
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toContain("NEXT_PUBLIC_SUPABASE_URL")
    expect(result.errors[1]).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  })

  it("rejects a non-URL supabase host", () => {
    const result = checkEnv({ ...validEnv, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })
    expect(result.errors.some((e) => e.includes("NEXT_PUBLIC_SUPABASE_URL"))).toBe(true)
  })

  it("warns when the service role key is missing", () => {
    const result = checkEnv({ ...validEnv, SUPABASE_SERVICE_ROLE_KEY: undefined })
    expect(result.errors).toEqual([])
    expect(result.warnings.some((w) => w.includes("SUPABASE_SERVICE_ROLE_KEY"))).toBe(true)
  })

  it("warns when Xero is only partially configured", () => {
    const result = checkEnv({ ...validEnv, XERO_CLIENT_ID: "abc" })
    expect(result.warnings.some((w) => w.includes("XERO_CLIENT_SECRET"))).toBe(true)
    expect(result.warnings.some((w) => w.includes("INTEGRATION_ENCRYPTION_KEY"))).toBe(true)
  })

  it("rejects an encryption key that is not 32 bytes", () => {
    const result = checkEnv({ ...validEnv, INTEGRATION_ENCRYPTION_KEY: "dG9vLXNob3J0" })
    expect(result.errors.some((e) => e.includes("INTEGRATION_ENCRYPTION_KEY"))).toBe(true)
  })

  it("accepts a valid 32-byte base64 encryption key", () => {
    const key = Buffer.from(new Uint8Array(32)).toString("base64")
    const result = checkEnv({ ...validEnv, INTEGRATION_ENCRYPTION_KEY: key })
    expect(result.errors).toEqual([])
  })
})

describe("assertEnv", () => {
  it("throws on fatal errors in production", () => {
    expect(() => assertEnv({ NODE_ENV: "production" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it("does not throw in development", () => {
    expect(() => assertEnv({ NODE_ENV: "development" })).not.toThrow()
  })

  it("does not throw in production when config is valid", () => {
    expect(() => assertEnv({ ...validEnv, NODE_ENV: "production" })).not.toThrow()
  })
})
