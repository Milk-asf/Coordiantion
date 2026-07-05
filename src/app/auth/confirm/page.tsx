"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message] = useState("Confirming your email…")

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/login?error=Supabase is not configured")
      return
    }

    const supabase = createClient()
    if (!supabase) {
      router.replace("/login?error=Supabase is not configured")
      return
    }

    const next = searchParams.get("next")
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null

    let cancelled = false

    const finish = async () => {
      if (cancelled) return
      // Claim any pending workspace invitations before routing: invited
      // members go to create-password, never the create-a-workspace
      // onboarding flow.
      let activated = 0
      try {
        const response = await fetch("/api/invite/accept", { method: "POST" })
        if (response.ok) {
          const data = (await response.json()) as { activated?: number }
          activated = data.activated ?? 0
        }
      } catch {
        // Fall through to the default destination; create-password retries
        // the claim as a safety net.
      }
      if (cancelled) return
      router.replace(safeNext ?? (activated > 0 ? "/create-password" : "/onboarding"))
      router.refresh()
    }

    const fail = (reason: string) => {
      if (!cancelled) {
        router.replace(`/login?error=${encodeURIComponent(reason)}`)
      }
    }

    const run = async () => {
      const tokenHash = searchParams.get("token_hash")
      const type = searchParams.get("type")

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change",
        })
        if (error) {
          fail(error.message)
          return
        }
        finish()
        return
      }

      const hash = window.location.hash.replace(/^#/, "")
      if (hash.includes("access_token")) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe()
            finish()
          }
        })

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          subscription.unsubscribe()
          finish()
          return
        }

        setTimeout(() => {
          subscription.unsubscribe()
          fail("Could not confirm your email. Please try signing in.")
        }, 8000)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        finish()
        return
      }

      fail("Invalid or expired confirmation link. Please sign up again.")
    }

    run()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-folk-surface">
      <div className="text-center">
        <div className="mx-auto mb-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-green-600 text-[14px] font-semibold text-white">
          C
        </div>
        <p className="text-[14px] font-medium text-folk-secondary">{message}</p>
      </div>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-folk-surface">
          <p className="text-[14px] font-medium text-folk-secondary">Confirming your email…</p>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  )
}
