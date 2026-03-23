"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export default function SignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
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

    try {
      const supabase = createClient()!
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      if (!data.user || !data.session) {
        setError("Check your email to confirm your account before signing in.")
        setIsLoading(false)
        return
      }

      const { data: wsId, error: wsError } = await supabase.rpc("create_workspace_for_user", {
        workspace_name: orgName || `${fullName}'s Workspace`,
        owner_id: data.user.id,
      })
      if (wsError) {
        setError("Account created but workspace setup failed. Please contact support.")
        setIsLoading(false)
        return
      }

      if (wsId) {
        const { error: memberError } = await supabase.from("workspace_members").upsert({
          workspace_id: wsId,
          user_id: data.user.id,
          role: "super-admin",
          status: "active",
        }, { onConflict: "workspace_id,user_id" })

        if (memberError) {
          setError("Account created but role assignment failed. Please contact support.")
          setIsLoading(false)
          return
        }
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
          <h1 className="text-[20px] font-semibold text-[#262626]">Create your account</h1>
          <p className="mt-[4px] text-[13px] font-medium text-[#888]">Set up your organisation on Coordination</p>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              required
              className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-white px-[12px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
            />
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Organisation name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your business or company"
              required
              className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-white px-[12px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
            />
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-white px-[12px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
            />
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
              className="h-[40px] w-full rounded-lg border border-[#e0e0e0] bg-white px-[12px] text-[13px] font-medium text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#a3c4f3] focus:shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
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
            {isLoading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-[11px] text-[#aaa]">
            You&apos;ll be the account owner with full admin access
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
