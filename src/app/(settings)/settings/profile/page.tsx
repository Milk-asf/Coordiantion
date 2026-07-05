"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Mail, Globe, Clock, Lock } from "lucide-react"
import { useToast } from "@/components/toast"
import {
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_OUTLINE_BTN_CLASS,
  SETTINGS_PRIMARY_BTN_CLASS,
  SettingsSelect,
} from "@/components/settings-ui"

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
  const router = useRouter()
  const { toast } = useToast()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [language, setLanguage] = useState("English (US)")
  const [timezone, setTimezone] = useState("(UTC+10) Australian Eastern Standard Time")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [isEmailEditing, setIsEmailEditing] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [isChangingEmail, setIsChangingEmail] = useState(false)

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
    }

  const handleUpdateProfile = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setIsSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        language,
        timezone,
      },
    })
    setIsSaving(false)
    if (error) {
      toast(error.message, "error")
    } else {
      setHasChanges(false)
      toast("Profile updated", "success")
    }
  }

  const resetEmailEditing = () => {
    setIsEmailEditing(false)
    setNewEmail("")
  }

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast("Please enter a valid email address", "error")
      return
    }

    if (!isSupabaseConfigured()) {
      toast("Supabase is not configured", "error")
      return
    }
    const supabase = createClient()
    if (!supabase) return

    setIsChangingEmail(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setIsChangingEmail(false)

    if (error) {
      toast(error.message, "error")
    } else {
      toast("Confirmation email sent to your new address", "success")
      resetEmailEditing()
    }
  }

  const isEmailFormValid = !!newEmail

  return (
    <>
      {/* Profile section */}
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-folk-text">Profile</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Manage settings for your personal profile.
        </p>
      </div>

      <div>
        <div className="grid gap-[16px] sm:grid-cols-2">
          <div>
            <label className={SETTINGS_LABEL_CLASS}>First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => handleFieldChange(setFirstName)(e.target.value)}
              placeholder="First name"
              className={SETTINGS_INPUT_CLASS}
            />
          </div>
          <div>
            <label className={SETTINGS_LABEL_CLASS}>Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleFieldChange(setLastName)(e.target.value)}
              placeholder="Last name"
              className={SETTINGS_INPUT_CLASS}
            />
          </div>
        </div>

        <div className="mt-[16px]">
          <label className={SETTINGS_LABEL_CLASS}>Email</label>
          {!isEmailEditing ? (
            <div className="flex items-center gap-[12px]">
              <div className={cn(SETTINGS_INPUT_CLASS, "flex flex-1 items-center gap-[8px]")}>
                <Mail className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                <span className="truncate text-folk-secondary">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => { setIsEmailEditing(true); setNewEmail("") }}
                className={cn(SETTINGS_OUTLINE_BTN_CLASS, "shrink-0")}
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
                onChange={(e) => setNewEmail(e.target.value)}
                className={SETTINGS_INPUT_CLASS}
                placeholder="new@email.com"
                autoFocus
              />
              <div className="flex items-center gap-[8px]">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={!isEmailFormValid || isChangingEmail}
                  className={SETTINGS_PRIMARY_BTN_CLASS}
                >
                  {isChangingEmail ? "Sending…" : "Update email"}
                </button>
                <button
                  type="button"
                  onClick={resetEmailEditing}
                  className={SETTINGS_OUTLINE_BTN_CLASS}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-[16px]">
          <label className={SETTINGS_LABEL_CLASS}>Password</label>
          <div className="flex items-center gap-[12px]">
            <div className={cn(SETTINGS_INPUT_CLASS, "flex flex-1 items-center gap-[8px]")}>
              <Lock className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
              <span className="tracking-[0.25em] text-folk-secondary">••••••••••</span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/update-password")}
              className={cn(SETTINGS_OUTLINE_BTN_CLASS, "shrink-0")}
              tabIndex={0}
            >
              Change
            </button>
          </div>
        </div>

        <div className="mt-[16px] grid gap-[16px] sm:grid-cols-2">
          <SettingsSelect
            label="Language"
            value={language}
            options={languageOptions}
            onChange={handleFieldChange(setLanguage)}
            icon={<Globe className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />}
          />
          <SettingsSelect
            label="Timezone"
            value={timezone}
            options={timezoneOptions}
            onChange={handleFieldChange(setTimezone)}
            icon={<Clock className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />}
          />
        </div>

        <div className="mt-[20px]">
          <button
            onClick={handleUpdateProfile}
            disabled={!hasChanges || isSaving}
            className={SETTINGS_PRIMARY_BTN_CLASS}
          >
            {isSaving ? "Updating…" : "Update profile"}
          </button>
        </div>
      </div>
    </>
  )
}
