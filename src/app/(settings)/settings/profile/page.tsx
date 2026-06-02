"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Mail, Globe, Clock, Lock } from "lucide-react"

const languageOptions = [
  "English (US)",
  "English (UK)",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Japanese",
  "Chinese (Simplified)",
]

const timezoneOptions = [
  "(UTC+10) Australian Eastern Standard Time",
  "(UTC+9:30) Australian Central Standard Time",
  "(UTC+8) Australian Western Standard Time",
  "(UTC+12) New Zealand Standard Time",
  "(UTC+0) Greenwich Mean Time",
  "(UTC-5) Eastern Standard Time",
  "(UTC-6) Central Standard Time",
  "(UTC-7) Mountain Standard Time",
  "(UTC-8) Pacific Standard Time",
  "(UTC-10) Hawaii-Aleutian Standard Time",
]

const inputClass = "h-[44px] w-full rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] px-[14px] text-[14px] text-[#262626] outline-none transition-colors placeholder:text-[#c0c0c0] focus:border-[#d0d0d0] focus:ring-2 focus:ring-[#e8e8e8]"
const labelClass = "mb-[8px] block text-[13px] font-semibold text-[#262626]"
const changeBtnClass = "h-[44px] shrink-0 rounded-[8px] border border-[#e0e0e0] bg-white px-[16px] text-[13px] font-semibold text-[#262626] transition-colors hover:bg-[#f5f5f5]"

function ProfileSelect({ label, value, options, onChange, icon }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; icon?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(inputClass, "flex items-center gap-[8px] text-left")}
          tabIndex={0}
        >
          {icon}
          <span className="truncate">{value}</span>
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[59]" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[220px] w-full overflow-y-auto rounded-[8px] border border-[#f0f0f0] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setIsOpen(false) }}
                  className={cn(
                    "flex w-full items-center px-[14px] py-[10px] text-left text-[13px] transition-colors hover:bg-[#f5f5f5]",
                    opt === value ? "bg-[#f0f0f0] font-medium text-[#262626]" : "text-[#555]"
                  )}
                  tabIndex={0}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [language, setLanguage] = useState("English (US)")
  const [timezone, setTimezone] = useState("(UTC+10) Australian Eastern Standard Time")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  const [isEmailEditing, setIsEmailEditing] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [emailSuccess, setEmailSuccess] = useState("")

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const fullName = user.user_metadata?.full_name || ""
      const parts = fullName.split(" ")
      setFirstName(parts[0] || "")
      setLastName(parts.slice(1).join(" ") || "")
      setEmail(user.email || "")
      if (user.user_metadata?.language) setLanguage(user.user_metadata.language)
      if (user.user_metadata?.timezone) setTimezone(user.user_metadata.timezone)
    })
  }, [])

  const handleFieldChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value)
      setHasChanges(true)
      setSaveMessage("")
    }

  const handleUpdateProfile = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setIsSaving(true)
    setSaveMessage("")
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        language,
        timezone,
      },
    })
    setIsSaving(false)
    if (error) {
      setSaveMessage(error.message)
    } else {
      setHasChanges(false)
      setSaveMessage("Profile updated")
      setTimeout(() => setSaveMessage(""), 3000)
    }
  }

  const resetEmailEditing = () => {
    setIsEmailEditing(false)
    setNewEmail("")
    setEmailError("")
    setEmailSuccess("")
  }

  const handleChangeEmail = async () => {
    setEmailError("")
    setEmailSuccess("")

    if (!newEmail || !newEmail.includes("@")) {
      setEmailError("Please enter a valid email address")
      return
    }

    if (!isSupabaseConfigured()) {
      setEmailError("Supabase is not configured")
      return
    }
    const supabase = createClient()
    if (!supabase) return

    setIsChangingEmail(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setIsChangingEmail(false)

    if (error) {
      setEmailError(error.message)
    } else {
      setEmailSuccess("Confirmation email sent to your new address")
      setNewEmail("")
    }
  }

  const isEmailFormValid = !!newEmail

  return (
    <>
      {/* Profile section */}
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-[#262626]">Profile</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Manage settings for your personal profile.
        </p>
      </div>

      <div>
        <div className="grid gap-[16px] sm:grid-cols-2">
          <div>
            <label className={labelClass}>First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => handleFieldChange(setFirstName)(e.target.value)}
              placeholder="First name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleFieldChange(setLastName)(e.target.value)}
              placeholder="Last name"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-[16px]">
          <label className={labelClass}>Email</label>
          {!isEmailEditing ? (
            <div className="flex items-center gap-[12px]">
              <div className={cn(inputClass, "flex flex-1 items-center gap-[8px]")}>
                <Mail className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
                <span className="truncate text-[#888]">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => { setIsEmailEditing(true); setNewEmail(""); setEmailError(""); setEmailSuccess("") }}
                className={changeBtnClass}
                tabIndex={0}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-[12px]">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailError(""); setEmailSuccess("") }}
                className={inputClass}
                placeholder="new@email.com"
                autoFocus
              />
              {emailError && (
                <p className="rounded-[8px] bg-red-50 px-[14px] py-[10px] text-[13px] font-medium text-red-600">{emailError}</p>
              )}
              {emailSuccess && (
                <p className="rounded-[8px] bg-green-50 px-[14px] py-[10px] text-[13px] font-medium text-green-600">{emailSuccess}</p>
              )}
              <div className="flex items-center gap-[10px]">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={!isEmailFormValid || isChangingEmail}
                  className={cn(
                    "h-[38px] rounded-[8px] px-[20px] text-[13px] font-semibold transition-colors",
                    isEmailFormValid
                      ? "primary-btn"
                      : "bg-[#e8e8e8] text-[#c0c0c0] cursor-not-allowed"
                  )}
                >
                  {isChangingEmail ? "Sending..." : "Update email"}
                </button>
                <button
                  type="button"
                  onClick={resetEmailEditing}
                  className="h-[38px] rounded-[8px] border border-[#e0e0e0] bg-white px-[20px] text-[13px] font-semibold text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-[16px]">
          <label className={labelClass}>Password</label>
          <div className="flex items-center gap-[12px]">
            <div className={cn(inputClass, "flex flex-1 items-center gap-[8px]")}>
              <Lock className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
              <span className="tracking-[0.25em] text-[#888]">••••••••••</span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/update-password")}
              className={changeBtnClass}
              tabIndex={0}
            >
              Change
            </button>
          </div>
        </div>

        <div className="mt-[16px] grid gap-[16px] sm:grid-cols-2">
          <ProfileSelect label="Language" value={language} options={languageOptions} onChange={handleFieldChange(setLanguage)} icon={<Globe className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />} />
          <ProfileSelect label="Timezone" value={timezone} options={timezoneOptions} onChange={handleFieldChange(setTimezone)} icon={<Clock className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />} />
        </div>

        <div className="mt-[20px] flex items-center gap-[12px]">
          <button
            onClick={handleUpdateProfile}
            disabled={!hasChanges || isSaving}
            className={cn(
              "h-[38px] rounded-[8px] px-[20px] text-[13px] font-semibold transition-colors",
              hasChanges
                ? "primary-btn"
                : "bg-[#e8e8e8] text-[#c0c0c0] cursor-not-allowed"
            )}
          >
            {isSaving ? "Updating..." : "Update profile"}
          </button>
          {saveMessage && (
            <span className="text-[13px] font-medium text-green-600">{saveMessage}</span>
          )}
        </div>
      </div>
    </>
  )
}
