"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

type Step = "credentials" | "code"

const RESEND_COOLDOWN_SECONDS = 45

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add your credentials to .env.local")
      return
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters.")
      return
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain uppercase, lowercase, and a number.")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()!
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { onboarding_step: "profile" },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.user?.identities && data.user.identities.length === 0) {
        setError("This email is already registered. Please sign in instead.")
        return
      }

      // Email confirmation disabled — session created immediately
      if (data.session) {
        router.push("/onboarding")
        router.refresh()
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
        type: "signup",
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
      const supabase = createClient()!
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email })
      if (resendError) {
        setError(resendError.message)
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
              setStep("credentials")
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
              <span className="font-medium text-[#262626]">{email}</span>. Enter it below to verify your account.
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
            Create your account to get started
          </p>
        </div>

        <form onSubmit={handleCreateAccount} className="flex flex-col gap-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
              tabIndex={0}
            />
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 12 characters"
                required
                minLength={12}
                className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-[12px] pr-[40px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                tabIndex={0}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#bbb] transition-colors hover:text-[#666]"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-[16px] w-[16px]" /> : <Eye className="h-[16px] w-[16px]" />}
              </button>
            </div>
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
            {isLoading ? "Creating account..." : "Continue"}
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
