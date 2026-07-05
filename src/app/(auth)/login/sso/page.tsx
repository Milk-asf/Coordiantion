"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export default function SsoLoginPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const domain = email.split("@")[1]?.trim().toLowerCase()
    if (!domain) {
      setError("Enter your work email address.")
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured.")
      return
    }
    const supabase = createClient()
    if (!supabase) return

    setIsRedirecting(true)
    const { data, error: ssoError } = await supabase.auth.signInWithSSO({
      domain,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (ssoError || !data?.url) {
      setIsRedirecting(false)
      setError(
        ssoError?.message.includes("No SSO provider")
          ? `Single sign-on isn't set up for ${domain}. Contact your administrator, or sign in with a password.`
          : ssoError?.message ?? "Could not start single sign-on."
      )
      return
    }

    window.location.assign(data.url)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-folk-surface">
      <div className="w-full max-w-[380px] px-[16px]">
        <div className="mb-[32px] text-center">
          <div className="mx-auto mb-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-green-600 text-white">
            <Building2 className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          <h1 className="text-[20px] font-semibold text-folk-text">Single sign-on</h1>
          <p className="mt-[4px] text-[13px] font-medium text-folk-secondary">
            Sign in with your organisation&apos;s identity provider
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Work email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              required
              autoFocus
              className="h-[40px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
            />
          </div>

          {error && (
            <p className="rounded-[6px] bg-red-50 px-[12px] py-[8px] text-[13px] font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isRedirecting}
            className="h-[40px] w-full rounded-[6px] bg-[#1a1a1a] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d] disabled:opacity-50"
          >
            {isRedirecting ? "Redirecting..." : "Continue with SSO"}
          </button>
        </form>

        <p className="mt-[16px] text-center text-[13px] font-medium text-folk-secondary">
          <Link href="/login" className="text-folk-text underline underline-offset-2 transition-colors hover:text-[#555]">
            Sign in with a password instead
          </Link>
        </p>
      </div>
    </div>
  )
}
