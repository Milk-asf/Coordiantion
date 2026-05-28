"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"
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

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setIsSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        avatar_url: avatarUrl,
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
