"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, ArrowLeft } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

type Step = "email" | "code"

const RESEND_COOLDOWN_SECONDS = 45

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const sendCode = async () => {
    const supabase = createClient()!
    return supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { onboarding_step: "profile" },
      },
    })
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add your credentials to .env.local")
      return
    }

    if (!email.trim().includes("@")) {
      setError("Enter a valid email address.")
      return
    }

    setIsLoading(true)
    try {
      const { error: otpError } = await sendCode()
      if (otpError) {
        setError(otpError.message)
        return
      }
      setStep("code")
      setResendIn(RESEND_COOLDOWN_SECONDS)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const token = code.replace(/\D/g, "")
    if (token.length !== 6) {
      setError("Enter the 6-digit code from your email.")
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()!
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      })

      if (verifyError) {
        setError(verifyError.message)
        return
      }

      router.push("/onboarding")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not verify the code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendIn > 0 || !isSupabaseConfigured()) return
    setError("")
    setIsLoading(true)
    try {
      const { error: otpError } = await sendCode()
      if (otpError) {
        setError(otpError.message)
        return
      }
      setResendIn(RESEND_COOLDOWN_SECONDS)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend the code.")
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "code") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="w-full max-w-[380px] px-[16px]">
          <button
            type="button"
            onClick={() => {
              setStep("email")
              setCode("")
              setError("")
            }}
            className="mb-[20px] flex items-center gap-[6px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]"
            tabIndex={0}
            aria-label="Go back"
          >
            <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={2} />
            Back
          </button>

          <div className="mb-[28px] text-center">
            <div className="mx-auto mb-[20px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-green-50">
              <Mail className="h-[22px] w-[22px] text-green-600" strokeWidth={1.75} />
            </div>
            <h1 className="text-[20px] font-semibold text-[#262626]">Enter your code</h1>
            <p className="mt-[8px] text-[14px] leading-[1.5] text-[#888]">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-[#262626]">{email}</span>. Enter it below to continue.
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="flex flex-col gap-[14px]">
            <div>
              <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                className="h-[48px] w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-center text-[20px] font-semibold tracking-[0.4em] text-[#262626] placeholder-[#ccc] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                tabIndex={0}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-[12px] py-[8px] text-[13px] font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="h-[40px] w-full rounded-lg bg-[#262626] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d] disabled:opacity-50"
              tabIndex={0}
            >
              {isLoading ? "Verifying..." : "Verify & continue"}
            </button>
          </form>

          <p className="mt-[20px] text-center text-[12px] text-[#aaa]">
            Didn&apos;t receive it?{" "}
            {resendIn > 0 ? (
              <span className="text-[#bbb]">Resend in {resendIn}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-[#262626] underline underline-offset-2 disabled:opacity-50"
                tabIndex={0}
              >
                Resend code
              </button>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="w-full max-w-[380px] px-[16px]">
        <div className="mb-[32px] text-center">
          <div className="mx-auto mb-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-green-600 text-[14px] font-semibold text-white">
            C
          </div>
          <h1 className="text-[20px] font-semibold text-[#262626]">Welcome to Coordination</h1>
          <p className="mt-[4px] text-[13px] font-medium text-[#888]">
            Enter your email and we&apos;ll send you a code to get started
          </p>
        </div>

        <form onSubmit={handleSendCode} className="flex flex-col gap-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
              tabIndex={0}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-[12px] py-[8px] text-[13px] font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="h-[40px] w-full rounded-lg bg-[#262626] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d] disabled:opacity-50"
            tabIndex={0}
          >
            {isLoading ? "Sending code..." : "Continue"}
          </button>

          <p className="text-center text-[11px] text-[#aaa]">
            We&apos;ll set up your profile and workspace in the next steps
          </p>
        </form>

        <p className="mt-[20px] text-center text-[13px] font-medium text-[#888]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#262626] underline underline-offset-2 transition-colors hover:text-[#555]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
