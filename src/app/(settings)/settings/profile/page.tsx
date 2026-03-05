"use client"

import { useState, useEffect } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"

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

export default function ProfileSettingsPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [language, setLanguage] = useState("English (US)")
  const [timezone, setTimezone] = useState("(UTC+10) Australian Eastern Standard Time")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  const handleChangePassword = async () => {
    setPasswordError("")
    setPasswordSuccess("")

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    if (!isSupabaseConfigured()) {
      setPasswordError("Supabase is not configured")
      return
    }
    const supabase = createClient()
    if (!supabase) return

    setIsChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsChangingPassword(false)

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(""), 3000)
    }
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
      setTimeout(() => setEmailSuccess(""), 5000)
    }
  }

  const inputClass = "h-[38px] w-full rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb] focus:bg-white"
  const selectClass = "h-[38px] w-full appearance-none rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] pr-[36px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb] focus:bg-white"
  const labelClass = "mb-[6px] block text-[13px] font-medium text-sidebar-muted"

  return (
    <>
      {/* Profile section */}
      <div className="mb-[40px]">
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Profile</h1>
        <p className="mt-[4px] text-[14px] text-sidebar-muted">
          Manage settings for your personal profile.
        </p>
      </div>

      <div className="flex flex-col gap-[18px]">
        <div className="flex gap-[16px]">
          <div className="flex-1">
            <label className={labelClass}>First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => handleFieldChange(setFirstName)(e.target.value)}
              className={inputClass}
              placeholder="First name"
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleFieldChange(setLastName)(e.target.value)}
              className={inputClass}
              placeholder="Last name"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="h-[38px] w-full rounded-[6px] border border-sidebar-border bg-sidebar-bg px-[12px] text-[14px] text-[#aaa] outline-none"
          />
        </div>

        <div>
          <label className={labelClass}>Language</label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => handleFieldChange(setLanguage)(e.target.value)}
              className={selectClass}
            >
              {languageOptions.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2">
              <svg className="h-[14px] w-[14px] text-sidebar-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Timezone</label>
          <div className="relative">
            <select
              value={timezone}
              onChange={(e) => handleFieldChange(setTimezone)(e.target.value)}
              className={selectClass}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2">
              <svg className="h-[14px] w-[14px] text-sidebar-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[12px] pt-[2px]">
          <button
            onClick={handleUpdateProfile}
            disabled={!hasChanges || isSaving}
            className={cn(
              "h-[34px] rounded-[6px] px-[16px] text-[13px] font-medium transition-colors",
              hasChanges
                ? "bg-[#262626] text-white hover:bg-[#3d3d3d]"
                : "bg-sidebar-hover text-[#bbb] cursor-not-allowed"
            )}
          >
            {isSaving ? "Updating..." : "Update"}
          </button>
          {saveMessage && (
            <span className="text-[13px] text-green-600">{saveMessage}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="my-[36px] h-px bg-sidebar-border" />

      {/* Change email section */}
      <div className="mb-[24px]">
        <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Change email</h2>
        <p className="mt-[4px] text-[13px] text-sidebar-muted">
          Update the email address associated with your account.
        </p>
      </div>

      <div className="flex flex-col gap-[18px]">
        <div>
          <label className={labelClass}>New email address</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setEmailError(""); setEmailSuccess("") }}
            className={inputClass}
            placeholder="new@email.com"
          />
        </div>

        {emailError && (
          <p className="rounded-[6px] bg-red-50 px-[12px] py-[8px] text-[13px] text-red-600">{emailError}</p>
        )}
        {emailSuccess && (
          <p className="rounded-[6px] bg-green-50 px-[12px] py-[8px] text-[13px] text-green-600">{emailSuccess}</p>
        )}

        <div>
          <button
            onClick={handleChangeEmail}
            disabled={!newEmail || isChangingEmail}
            className={cn(
              "h-[34px] rounded-[6px] px-[16px] text-[13px] font-medium transition-colors",
              newEmail
                ? "bg-[#262626] text-white hover:bg-[#3d3d3d]"
                : "bg-sidebar-hover text-[#bbb] cursor-not-allowed"
            )}
          >
            {isChangingEmail ? "Sending..." : "Update email"}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="my-[36px] h-px bg-sidebar-border" />

      {/* Change password section */}
      <div className="mb-[24px]">
        <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Change password</h2>
        <p className="mt-[4px] text-[13px] text-sidebar-muted">
          Update the password used to sign in to your account.
        </p>
      </div>

      <div className="flex flex-col gap-[18px]">
        <div>
          <label className={labelClass}>Current password</label>
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError("") }}
              className={cn(inputClass, "pr-[40px]")}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-[10px] top-1/2 -translate-y-1/2 text-sidebar-muted transition-colors hover:text-sidebar-text"
              tabIndex={-1}
            >
              {showCurrentPassword
                ? <EyeOff className="h-[16px] w-[16px]" strokeWidth={1.75} />
                : <Eye className="h-[16px] w-[16px]" strokeWidth={1.75} />
              }
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>New password</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError("") }}
              className={cn(inputClass, "pr-[40px]")}
              placeholder="Min 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-[10px] top-1/2 -translate-y-1/2 text-sidebar-muted transition-colors hover:text-sidebar-text"
              tabIndex={-1}
            >
              {showNewPassword
                ? <EyeOff className="h-[16px] w-[16px]" strokeWidth={1.75} />
                : <Eye className="h-[16px] w-[16px]" strokeWidth={1.75} />
              }
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Confirm new password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError("") }}
              className={cn(inputClass, "pr-[40px]")}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-[10px] top-1/2 -translate-y-1/2 text-sidebar-muted transition-colors hover:text-sidebar-text"
              tabIndex={-1}
            >
              {showConfirmPassword
                ? <EyeOff className="h-[16px] w-[16px]" strokeWidth={1.75} />
                : <Eye className="h-[16px] w-[16px]" strokeWidth={1.75} />
              }
            </button>
          </div>
        </div>

        {passwordError && (
          <p className="rounded-[6px] bg-red-50 px-[12px] py-[8px] text-[13px] text-red-600">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="rounded-[6px] bg-green-50 px-[12px] py-[8px] text-[13px] text-green-600">{passwordSuccess}</p>
        )}

        <div>
          <button
            onClick={handleChangePassword}
            disabled={!newPassword || !confirmPassword || isChangingPassword}
            className={cn(
              "h-[34px] rounded-[6px] px-[16px] text-[13px] font-medium transition-colors",
              newPassword && confirmPassword
                ? "bg-[#262626] text-white hover:bg-[#3d3d3d]"
                : "bg-sidebar-hover text-[#bbb] cursor-not-allowed"
            )}
          >
            {isChangingPassword ? "Updating..." : "Change password"}
          </button>
        </div>
      </div>
    </>
  )
}
