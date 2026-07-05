"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"

/**
 * When a workspace has `require_mfa` enabled, members who haven't enrolled a
 * second factor are blocked from the dashboard until they set one up.
 * Settings routes stay reachable so /settings/security can complete enrolment.
 */
export function RequireMfaGate() {
  const { activeWorkspace } = useWorkspace()
  const [isBlocked, setIsBlocked] = useState(false)

  const check = useCallback(async () => {
    if (!isSupabaseConfigured() || !activeWorkspace?.id) {
      setIsBlocked(false)
      return
    }
    const supabase = createClient()
    if (!supabase) return

    const { data: settings } = await supabase
      .from("workspace_settings")
      .select("require_mfa")
      .eq("workspace_id", activeWorkspace.id)
      .maybeSingle()

    if (!settings?.require_mfa) {
      setIsBlocked(false)
      return
    }

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasVerifiedFactor = (factors?.totp ?? []).some((f) => f.status === "verified")
    setIsBlocked(!hasVerifiedFactor)
  }, [activeWorkspace?.id])

  useEffect(() => {
    check()
    // Re-check when the tab regains focus, e.g. after enrolling in settings.
    window.addEventListener("focus", check)
    return () => window.removeEventListener("focus", check)
  }, [check])

  if (!isBlocked) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-folk-surface">
      <div className="w-full max-w-[420px] px-[24px] text-center">
        <div className="mx-auto mb-[16px] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert className="h-[20px] w-[20px] text-amber-600" strokeWidth={1.75} />
        </div>
        <h1 className="text-[18px] font-semibold text-folk-text">
          Two-factor authentication required
        </h1>
        <p className="mt-[8px] text-[13px] leading-[1.6] text-folk-secondary">
          {activeWorkspace?.name ?? "Your organisation"} requires all members to protect their
          account with two-factor authentication. Set it up once with your authenticator app
          and you&apos;re back in.
        </p>
        <Link
          href="/settings/security"
          className="primary-btn mt-[20px] inline-flex h-[40px] items-center px-[20px] text-[13px] font-semibold"
        >
          Set up two-factor authentication
        </Link>
      </div>
    </div>
  )
}
