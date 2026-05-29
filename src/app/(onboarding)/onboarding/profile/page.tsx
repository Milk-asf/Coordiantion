"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Eye, EyeOff } from "lucide-react"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { AvatarUpload } from "@/components/onboarding/avatar-upload"
import {
  inputClass,
  labelClass,
  primaryBtnClass,
} from "@/components/onboarding/onboarding-styles"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useOnboarding } from "@/lib/hooks/use-onboarding"
import { getStep } from "@/lib/onboarding/onboarding-steps"

export default function OnboardingProfilePage() {
  const router = useRouter()
  const { setStep } = useOnboarding()
  const step = getStep("profile")

  const [userId, setUserId] = useState("")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login")
        return
      }
      setUserId(user.id)
      setEmail(user.email || "")
      const meta = user.user_metadata || {}
      const fullName = (meta.full_name as string) || ""
      const parts = fullName.split(" ").filter(Boolean)
      setFirstName((meta.first_name as string) || parts[0] || "")
      setLastName((meta.last_name as string) || parts.slice(1).join(" ") || "")
      setAvatarUrl((meta.avatar_url as string) || "")
      // Users created via OTP have no password yet; ask them to set one.
      const hasPwd = Boolean(meta.has_password)
      setHasPassword(hasPwd)
      setIsLoading(false)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.")
      return
    }

    if (!hasPassword) {
      if (password.length < 12) {
        setError("Password must be at least 12 characters.")
        return
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        setError("Password must contain uppercase, lowercase, and a number.")
        return
      }
    }

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setIsSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({
      ...(hasPassword ? {} : { password }),
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        avatar_url: avatarUrl,
        has_password: true,
      },
    })

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    await setStep("workspace")
    router.push("/onboarding/workspace")
  }

  if (isLoading) {
    return (
      <OnboardingShell step="profile" index={step.index} title={step.title}>
        <div className="h-[200px]" />
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell step="profile" index={step.index} title={step.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        {userId && (
          <AvatarUpload userId={userId} value={avatarUrl} onChange={setAvatarUrl} />
        )}

        <div className="grid gap-[14px] sm:grid-cols-2">
          <div>
            <label className={labelClass}>First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              required
              className={inputClass}
              tabIndex={0}
            />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              required
              className={inputClass}
              tabIndex={0}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <div className={`${inputClass} flex cursor-not-allowed items-center gap-[8px] opacity-70`}>
            <Mail className="h-[14px] w-[14px] text-[#999]" strokeWidth={1.5} />
            <span className="truncate">{email}</span>
          </div>
        </div>

        {!hasPassword && (
          <div>
            <label className={labelClass}>Create a password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 12 characters"
                required
                minLength={12}
                autoComplete="new-password"
                className={`${inputClass} pr-[40px]`}
                tabIndex={0}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#bbb] transition-colors hover:text-[#666]"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-[16px] w-[16px]" /> : <Eye className="h-[16px] w-[16px]" />}
              </button>
            </div>
            <p className="mt-[6px] text-[11px] text-[#aaa]">
              You&apos;ll use this with your email to sign in next time.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-[8px] bg-red-50 px-[12px] py-[8px] text-[12px] font-medium text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={primaryBtnClass} tabIndex={0}>
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </OnboardingShell>
  )
}
