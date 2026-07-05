"use client"

import { Suspense, useActionState, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { loginAction, type LoginActionState } from "./actions"

function LoginForm() {
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [urlError, setUrlError] = useState("")
  const [state, formAction, isPending] = useActionState<LoginActionState, FormData>(
    loginAction,
    {},
  )

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) setUrlError(decodeURIComponent(error))
  }, [searchParams])

  const error = state.error ?? urlError

  return (
    <div className="flex min-h-screen items-center justify-center bg-folk-surface">
      <div className="w-full max-w-[380px] px-[16px]">
        <div className="mb-[32px] text-center">
          <div className="mx-auto mb-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-green-600 text-[14px] font-semibold text-white">
            C
          </div>
          <h1 className="text-[20px] font-semibold text-folk-text">Welcome back</h1>
          <p className="mt-[4px] text-[13px] font-medium text-folk-secondary">Sign in to your account</p>
        </div>

        <form action={formAction} className="flex flex-col gap-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              className="h-[40px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
            />
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="h-[40px] w-full rounded-[6px] border border-folk-border bg-folk-page px-[12px] pr-[40px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 text-folk-placeholder transition-colors hover:text-folk-secondary"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-[16px] w-[16px]" /> : <Eye className="h-[16px] w-[16px]" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-[6px] bg-red-50 px-[12px] py-[8px] text-[13px] font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="h-[40px] w-full rounded-[6px] bg-[#1a1a1a] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d] disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-[16px] flex items-center justify-center gap-[16px] text-center">
          <Link href="/reset-password" className="text-[13px] font-medium text-folk-secondary underline underline-offset-2 transition-colors hover:text-folk-text">
            Forgot your password?
          </Link>
          <Link href="/login/sso" className="text-[13px] font-medium text-folk-secondary underline underline-offset-2 transition-colors hover:text-folk-text">
            Use single sign-on
          </Link>
        </div>

        <p className="mt-[12px] text-center text-[13px] font-medium text-folk-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-folk-text underline underline-offset-2 transition-colors hover:text-[#555]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-folk-surface">
          <p className="text-[14px] font-medium text-folk-secondary">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
