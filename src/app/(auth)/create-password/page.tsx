"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

interface WorkspaceBranding {
  name: string
  logoUrl: string
}

export default function CreatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [branding, setBranding] = useState<WorkspaceBranding>({ name: "", logoUrl: "" })

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      if (!isSupabaseConfigured()) {
        if (isMounted) setIsReady(true)
        return
      }

      const supabase = createClient()!
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      // Safety net: claim any pending workspace invitations for this account,
      // whichever auth path landed the user here. Idempotent server-side.
      try {
        await fetch("/api/invite/accept", { method: "POST" })
      } catch {
        // Non-fatal — the membership can still be activated on next sign-in.
      }

      // Already set a password before — no need to do it again.
      if (user.user_metadata?.has_password) {
        router.replace("/tasks")
        return
      }

      try {
        const res = await fetch("/api/workspace-branding")
        if (res.ok && isMounted) {
          const data = (await res.json()) as WorkspaceBranding
          setBranding({ name: data.name || "", logoUrl: data.logoUrl || "" })
        }
      } catch {
        // Branding is non-critical — fall back to the default heading.
      }

      if (isMounted) setIsReady(true)
    }

    init()
    return () => { isMounted = false }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 12) {
      setError("Password must be at least 12 characters.")
      return
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain uppercase, lowercase, and a number.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()!
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { has_password: true },
      })

      if (updateError) {
        setError(updateError.message)
        setIsLoading(false)
        return
      }

      router.push("/tasks")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  const workspaceLabel = branding.name || "your workspace"
  const initial = (branding.name || "W").charAt(0).toUpperCase()

  return (
    <div className="flex min-h-screen items-center justify-center bg-folk-surface">
      <div className="w-full max-w-[380px] px-[16px]">
        <div className="mb-[32px] text-center">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={`${workspaceLabel} logo`}
              className="mx-auto mb-[16px] h-[48px] w-[48px] rounded-[6px] object-cover"
            />
          ) : (
            <div className="mx-auto mb-[16px] flex h-[48px] w-[48px] items-center justify-center rounded-[6px] bg-[#1a1a1a] text-[18px] font-semibold text-white">
              {initial}
            </div>
          )}
          {branding.name && (
            <p className="mb-[4px] text-[13px] font-semibold text-folk-secondary">{branding.name}</p>
          )}
          <h1 className="text-[20px] font-semibold text-folk-text">Create your password</h1>
          <p className="mt-[4px] text-[13px] font-medium text-folk-secondary">
            Set a password to finish joining {workspaceLabel}.
          </p>
        </div>

        {!isReady ? (
          <div className="flex h-[120px] items-center justify-center">
            <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-folk-border border-t-[#1a1a1a]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
            <div>
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={12}
                  autoComplete="new-password"
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
              <p className="mt-[4px] text-[11px] font-medium text-[#aaa]">
                At least 12 characters with uppercase, lowercase, and a number.
              </p>
            </div>

            <div>
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Confirm password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={12}
                  autoComplete="new-password"
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
              disabled={isLoading}
              className="h-[40px] w-full rounded-[6px] bg-[#1a1a1a] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d] disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create password & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
