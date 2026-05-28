"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Mail, CheckCircle2 } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getAuthCallbackUrl } from "@/lib/get-site-url"

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add your credentials to .env.local")
      setIsLoading(false)
      return
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters.")
      setIsLoading(false)
      return
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain uppercase, lowercase, and a number.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()!
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl("/onboarding"),
          data: {
            onboarding_step: "profile",
          },
        },
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError("Something went wrong creating your account. Please try again.")
        setIsLoading(false)
        return
      }

      if (data.user.identities && data.user.identities.length === 0) {
        setError("This email is already registered. Please sign in instead.")
        setIsLoading(false)
        return
      }

      if (!data.session) {
        setSuccessMessage("confirmation-sent")
        setIsLoading(false)
        return
      }

      router.push("/onboarding")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (successMessage === "confirmation-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="w-full max-w-[380px] px-[16px] text-center">
          <div className="mx-auto mb-[20px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-green-50">
            <Mail className="h-[22px] w-[22px] text-green-600" strokeWidth={1.75} />
          </div>
          <h1 className="text-[20px] font-semibold text-[#262626]">Check your email</h1>
          <p className="mt-[8px] text-[14px] leading-[1.5] text-[#888]">
            We sent a confirmation link to <span className="font-medium text-[#262626]">{email}</span>. Click the link to verify your account and start setting up.
          </p>
          <div className="mt-[24px] rounded-[10px] border border-[#e8f5e9] bg-[#f1f8f2] px-[16px] py-[14px]">
            <div className="flex items-start gap-[10px]">
              <CheckCircle2 className="mt-[1px] h-[16px] w-[16px] shrink-0 text-green-600" strokeWidth={2} />
              <div className="text-left">
                <p className="text-[13px] font-medium text-[#262626]">Your account has been created</p>
                <p className="mt-[2px] text-[12px] text-[#666]">Once confirmed, we&apos;ll walk you through setting up your profile and workspace.</p>
              </div>
            </div>
          </div>
          <p className="mt-[20px] text-[12px] text-[#bbb]">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="text-[#262626] underline underline-offset-2"
              tabIndex={0}
            >
              try again
            </button>
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

        <form onSubmit={handleSignUp} className="flex flex-col gap-[14px]">
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
