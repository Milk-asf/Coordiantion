"use client"

import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export default function MfaChallengePage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === "verified")
      if (verified) {
        setFactorId(verified.id)
      } else {
        // Nothing to challenge — the middleware will route them into the app.
        window.location.assign("/")
      }
    })
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || code.length !== 6) return
    setError("")
    const supabase = createClient()
    if (!supabase) return
    setIsVerifying(true)

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setIsVerifying(false)
      setError(challengeError?.message ?? "Could not start verification")
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })

    if (verifyError) {
      setIsVerifying(false)
      setError("That code didn't work. Check your authenticator app and try again.")
      setCode("")
      return
    }

    // Full reload so the upgraded (AAL2) session cookie is picked up server-side.
    window.location.assign("/")
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    if (supabase) await supabase.auth.signOut()
    window.location.assign("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-folk-surface">
      <div className="w-full max-w-[380px] px-[16px]">
        <div className="mb-[32px] text-center">
          <div className="mx-auto mb-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-green-600 text-white">
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          <h1 className="text-[20px] font-semibold text-folk-text">Two-factor authentication</h1>
          <p className="mt-[4px] text-[13px] font-medium text-folk-secondary">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-[14px]">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            autoFocus
            className="h-[48px] w-full rounded-[6px] border border-folk-border bg-folk-page px-[12px] text-center font-mono text-[18px] tracking-[0.4em] text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
          />

          {error && (
            <p className="rounded-[6px] bg-red-50 px-[12px] py-[8px] text-[13px] font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || isVerifying || !factorId}
            className="h-[40px] w-full rounded-[6px] bg-[#1a1a1a] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d] disabled:opacity-50"
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-[16px] text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[13px] font-medium text-folk-secondary underline underline-offset-2 transition-colors hover:text-folk-text"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  )
}
