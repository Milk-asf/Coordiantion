"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const urlError = searchParams.get("error")
    if (urlError) setError(decodeURIComponent(urlError))
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add your credentials to .env.local")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()!
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      router.push("/tasks")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="w-full max-w-[380px] px-[16px]">
        <div className="mb-[32px] text-center">
          <div className="mx-auto mb-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-green-600 text-[14px] font-semibold text-white">
            C
          </div>
          <h1 className="text-[20px] font-semibold text-[#262626]">Welcome back</h1>
          <p className="mt-[4px] text-[13px] font-medium text-[#888]">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-[14px]">
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

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-[#fafafa] px-[12px] pr-[40px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
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
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-[16px] text-center">
          <Link href="/reset-password" className="text-[13px] font-medium text-[#888] underline underline-offset-2 transition-colors hover:text-[#262626]">
            Forgot your password?
          </Link>
        </div>

        <p className="mt-[12px] text-center text-[13px] font-medium text-[#888]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#262626] underline underline-offset-2 transition-colors hover:text-[#555]">
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
        <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
          <p className="text-[14px] font-medium text-[#666]">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
