"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { WorkspaceLogoUpload } from "@/components/onboarding/workspace-logo-upload"
import {
  inputClass,
  labelClass,
  primaryBtnClass,
} from "@/components/onboarding/onboarding-styles"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useOnboarding } from "@/lib/hooks/use-onboarding"
import { getStep } from "@/lib/onboarding/onboarding-steps"

const referralOptions = [
  "Search engine",
  "Social media",
  "A friend or colleague",
  "An NDIS event or community group",
  "Online ad",
  "Other",
]

export default function OnboardingWorkspacePage() {
  const router = useRouter()
  const { setStep } = useOnboarding()
  const step = getStep("workspace")

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [abn, setAbn] = useState("")
  const [referral, setReferral] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

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

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Check for existing workspace
      const { data: existing } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      let wsId: string | null = existing?.id ?? null

      if (!wsId) {
        const meta = user.user_metadata || {}
        const fallbackName =
          (meta.org_name as string) ||
          (meta.full_name as string) ||
          user.email?.split("@")[0] ||
          "My"
        const initialName = `${fallbackName}'s Workspace`

        const { data: newId, error: rpcError } = await supabase.rpc("create_workspace_for_user", {
          workspace_name: initialName,
          owner_id: user.id,
        })

        if (rpcError) {
          setError("Could not create workspace. Please refresh and try again.")
          setIsLoading(false)
          return
        }

        wsId = newId as string

        if (wsId) {
          await supabase.from("workspace_members").upsert(
            {
              workspace_id: wsId,
              user_id: user.id,
              role: "super-admin",
              status: "active",
            },
            { onConflict: "workspace_id,user_id" }
          )
        }
      }

      setWorkspaceId(wsId)

      if (wsId) {
        const { data: settings } = await supabase
          .from("workspace_settings")
          .select("*")
          .eq("workspace_id", wsId)
          .maybeSingle()

        if (settings) {
          setCompanyName((settings.org_name as string) || existing?.name || "")
          setAbn((settings.org_abn as string) || "")
          setReferral((settings.referral_source as string) || "")
          setLogoUrl((settings.logo_url as string) || "")
        } else if (existing?.name) {
          setCompanyName(existing.name)
        }
      }

      setIsLoading(false)
    }

    init().catch((err) => {
      console.error("Workspace step init failed:", err)
      setError(err instanceof Error ? err.message : "Failed to load workspace")
      setIsLoading(false)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!companyName.trim()) {
      setError("Please enter your company name.")
      return
    }
    if (!referral) {
      setError("Please tell us how you heard about us.")
      return
    }
    if (!workspaceId) {
      setError("Workspace not ready. Please refresh.")
      return
    }

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setIsSubmitting(true)

    const { error: wsError } = await supabase
      .from("workspaces")
      .update({ name: companyName.trim() })
      .eq("id", workspaceId)

    if (wsError) {
      setError(wsError.message)
      setIsSubmitting(false)
      return
    }

    const { error: settingsError } = await supabase
      .from("workspace_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          org_name: companyName.trim(),
          org_abn: abn.trim(),
          referral_source: referral,
          logo_url: logoUrl,
        },
        { onConflict: "workspace_id" }
      )

    if (settingsError) {
      setError(settingsError.message)
      setIsSubmitting(false)
      return
    }

    await setStep("team")
    router.push("/onboarding/team")
  }

  return (
    <OnboardingShell step="workspace" index={step.index} title={step.title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <WorkspaceLogoUpload workspaceId={workspaceId} value={logoUrl} onChange={setLogoUrl} />

        <div>
          <label className={labelClass}>Company name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter your company name"
            required
            className={inputClass}
            tabIndex={0}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className={labelClass}>ABN <span className="font-normal text-folk-placeholder">(optional)</span></label>
          <input
            type="text"
            value={abn}
            onChange={(e) => setAbn(e.target.value)}
            placeholder="XX XXX XXX XXX"
            className={inputClass}
            tabIndex={0}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className={labelClass}>How did you hear about us?</label>
          <select
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            required
            className={inputClass}
            tabIndex={0}
            disabled={isLoading}
          >
            <option value="" disabled>
              Choose an option
            </option>
            {referralOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-none bg-red-50 px-[12px] py-[8px] text-[12px] font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className={primaryBtnClass}
          tabIndex={0}
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </OnboardingShell>
  )
}
