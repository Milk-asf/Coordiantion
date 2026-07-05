"use client"

import { useCallback, useEffect, useState } from "react"
import { KeyRound, ShieldCheck, Smartphone, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/badge"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Switch } from "@/components/switch"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useWorkspace } from "@/lib/workspace-context"
import {
  SETTINGS_INPUT_CLASS,
  SETTINGS_OUTLINE_BTN_CLASS,
  SETTINGS_PRIMARY_BTN_CLASS,
  SETTINGS_SECTION_CLASS,
} from "@/components/settings-ui"

interface EnrolledFactor {
  id: string
  friendly_name?: string | null
  status: "verified" | "unverified"
  created_at: string
}

const inputClass = SETTINGS_INPUT_CLASS

export default function SecuritySettingsPage() {
  const { isSuperAdmin } = usePermissions()
  const { activeWorkspace } = useWorkspace()

  const [factors, setFactors] = useState<EnrolledFactor[]>([])
  const [isLoadingFactors, setIsLoadingFactors] = useState(true)
  const [error, setError] = useState("")

  // Enrolment flow state
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null)
  const [verifyCode, setVerifyCode] = useState("")
  const [isBusy, setIsBusy] = useState(false)

  // Workspace enforcement
  const [requireMfa, setRequireMfa] = useState(false)
  const [isSavingRequireMfa, setIsSavingRequireMfa] = useState(false)

  const verifiedFactors = factors.filter((f) => f.status === "verified")

  const refreshFactors = useCallback(async () => {
    if (!isSupabaseConfigured()) { setIsLoadingFactors(false); return }
    const supabase = createClient()
    if (!supabase) { setIsLoadingFactors(false); return }
    const { data, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) {
      setError(listError.message)
    } else {
      setFactors((data?.totp ?? []) as EnrolledFactor[])
    }
    setIsLoadingFactors(false)
  }, [])

  useEffect(() => { refreshFactors() }, [refreshFactors])

  useEffect(() => {
    if (!isSupabaseConfigured() || !activeWorkspace?.id) return
    const supabase = createClient()
    if (!supabase) return
    let cancelled = false
    supabase
      .from("workspace_settings")
      .select("require_mfa")
      .eq("workspace_id", activeWorkspace.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setRequireMfa(Boolean(data.require_mfa))
      })
    return () => { cancelled = true }
  }, [activeWorkspace?.id])

  const handleStartEnrolment = async () => {
    setError("")
    if (!isSupabaseConfigured()) { setError("Supabase is not configured"); return }
    const supabase = createClient()
    if (!supabase) return
    setIsBusy(true)

    // Clear out abandoned enrolment attempts so the friendly name stays free.
    for (const stale of factors.filter((f) => f.status === "unverified")) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id })
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
    })
    setIsBusy(false)

    if (enrollError || !data) {
      setError(enrollError?.message ?? "Could not start enrolment")
      return
    }
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    setVerifyCode("")
  }

  const handleVerifyEnrolment = async () => {
    if (!enrolling || verifyCode.length < 6) return
    setError("")
    const supabase = createClient()
    if (!supabase) return
    setIsBusy(true)

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrolling.factorId,
    })
    if (challengeError || !challenge) {
      setIsBusy(false)
      setError(challengeError?.message ?? "Could not verify code")
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: challenge.id,
      code: verifyCode.trim(),
    })
    setIsBusy(false)

    if (verifyError) {
      setError(verifyError.message)
      return
    }
    setEnrolling(null)
    setVerifyCode("")
    await refreshFactors()
  }

  const handleCancelEnrolment = async () => {
    if (!enrolling) return
    const supabase = createClient()
    if (supabase) await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId })
    setEnrolling(null)
    setVerifyCode("")
  }

  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null)

  const handleConfirmRemoveFactor = async () => {
    const factorId = removingFactorId
    setRemovingFactorId(null)
    if (!factorId) return
    setError("")
    const supabase = createClient()
    if (!supabase) return
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId })
    if (unenrollError) {
      setError(unenrollError.message)
      return
    }
    await refreshFactors()
  }

  const handleToggleRequireMfa = async () => {
    if (!activeWorkspace?.id) return
    const supabase = createClient()
    if (!supabase) return
    const next = !requireMfa
    setRequireMfa(next)
    setIsSavingRequireMfa(true)
    const { error: updateError } = await supabase
      .from("workspace_settings")
      .update({ require_mfa: next })
      .eq("workspace_id", activeWorkspace.id)
    setIsSavingRequireMfa(false)
    if (updateError) {
      setRequireMfa(!next)
      setError(updateError.message)
    }
  }

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-folk-text">Security</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Protect your account with two-factor authentication.
        </p>
      </div>

      {error && (
        <p className="mb-[16px] rounded-[6px] border border-red-200 bg-red-50 px-[14px] py-[10px] text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}

      <div className={cn(SETTINGS_SECTION_CLASS, "p-[20px]")}>
        <div className="flex items-start justify-between gap-[16px]">
          <div>
            <div className="flex items-center gap-[8px]">
              <Smartphone className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
              <h2 className="text-[13px] font-semibold text-folk-text">Two-factor authentication</h2>
              {verifiedFactors.length > 0 && <Badge variant="success">Enabled</Badge>}
            </div>
            <p className="mt-[6px] text-[13px] text-folk-secondary">
              Use an authenticator app (1Password, Google Authenticator, Authy) to generate a
              6-digit code required at sign-in.
            </p>
          </div>
        </div>

        {isLoadingFactors ? (
          <p className="mt-[16px] text-[13px] text-folk-secondary">Loading…</p>
        ) : enrolling ? (
          <div className="mt-[20px] border-t border-folk-border-subtle pt-[20px]">
            <p className="text-[13px] font-medium text-folk-text">
              1. Scan this QR code with your authenticator app
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qrCode}
              alt="TOTP enrolment QR code"
              className="mt-[12px] h-[168px] w-[168px] rounded-[6px] border border-folk-border-subtle bg-white p-[8px]"
            />
            <p className="mt-[10px] text-[12px] text-folk-secondary">
              Can&apos;t scan? Enter this key manually:{" "}
              <span className="select-all font-mono text-[11px] text-folk-text">{enrolling.secret}</span>
            </p>

            <p className="mt-[16px] text-[13px] font-medium text-folk-text">
              2. Enter the 6-digit code from the app
            </p>
            <div className="mt-[8px] flex max-w-[320px] items-center gap-[10px]">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className={cn(inputClass, "font-mono tracking-[0.3em]")}
                autoFocus
              />
              <button
                type="button"
                onClick={handleVerifyEnrolment}
                disabled={verifyCode.length !== 6 || isBusy}
                className={cn(SETTINGS_PRIMARY_BTN_CLASS, "shrink-0")}
              >
                {isBusy ? "Verifying…" : "Verify"}
              </button>
              <button
                type="button"
                onClick={handleCancelEnrolment}
                className={cn(SETTINGS_OUTLINE_BTN_CLASS, "shrink-0")}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : verifiedFactors.length > 0 ? (
          <ul className="mt-[16px] space-y-[8px]">
            {verifiedFactors.map((factor) => (
              <li
                key={factor.id}
                className="flex items-center justify-between gap-[12px] rounded-[6px] border border-folk-border-subtle bg-folk-page px-[14px] py-[10px]"
              >
                <div className="flex items-center gap-[10px]">
                  <KeyRound className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
                  <div>
                    <p className="text-[13px] font-medium text-folk-text">
                      {factor.friendly_name || "Authenticator app"}
                    </p>
                    <p className="text-[12px] text-folk-secondary">
                      Added {new Date(factor.created_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemovingFactorId(factor.id)}
                  className="flex items-center gap-[6px] text-[12px] font-medium text-red-600 transition-colors hover:text-red-700"
                  aria-label="Remove authenticator"
                >
                  <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={handleStartEnrolment}
            disabled={isBusy}
            className={cn(SETTINGS_PRIMARY_BTN_CLASS, "mt-[16px]")}
          >
            {isBusy ? "Preparing…" : "Set up two-factor authentication"}
          </button>
        )}
      </div>

      {isSuperAdmin && (
        <div className={cn(SETTINGS_SECTION_CLASS, "mt-[24px] p-[20px]")}>
          <div className="flex items-start justify-between gap-[16px]">
            <div>
              <div className="flex items-center gap-[8px]">
                <ShieldCheck className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
                <h2 className="text-[13px] font-semibold text-folk-text">Require two-factor for everyone</h2>
              </div>
              <p className="mt-[6px] text-[13px] text-folk-secondary">
                Members of {activeWorkspace?.name ?? "this workspace"} without two-factor
                authentication will be asked to set it up before they can keep using the app.
              </p>
            </div>
            <Switch
              checked={requireMfa}
              onChange={handleToggleRequireMfa}
              disabled={isSavingRequireMfa}
              ariaLabel="Require two-factor authentication for all members"
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={removingFactorId !== null}
        title="Remove authenticator?"
        description="You will no longer be asked for a 6-digit code when signing in."
        confirmLabel="Remove"
        onConfirm={handleConfirmRemoveFactor}
        onCancel={() => setRemovingFactorId(null)}
      />
    </>
  )
}
