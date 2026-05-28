"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getAuthCallbackUrl } from "@/lib/get-site-url"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()!
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthCallbackUrl("/update-password"),
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      setIsSent(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="w-full max-w-[380px] px-[16px] text-center">
          <div className="mx-auto mb-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-green-600 text-[14px] font-semibold text-white">
            ✓
          </div>
          <h1 className="text-[20px] font-semibold text-[#262626]">Check your email</h1>
          <p className="mt-[8px] text-[13px] font-medium text-[#888]">
            We sent a password reset link to <span className="text-[#262626]">{email}</span>. Click the link in the email to reset your password.
          </p>
          <Link
            href="/login"
            className="mt-[24px] inline-block text-[13px] font-medium text-[#262626] underline underline-offset-2 transition-colors hover:text-[#555]"
          >
            Back to sign in
          </Link>
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
          <h1 className="text-[20px] font-semibold text-[#262626]">Reset your password</h1>
          <p className="mt-[4px] text-[13px] font-medium text-[#888]">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
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
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-[20px] text-center text-[13px] font-medium text-[#888]">
          Remember your password?{" "}
          <Link href="/login" className="text-[#262626] underline underline-offset-2 transition-colors hover:text-[#555]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
