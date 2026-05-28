"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import {
  inputClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from "@/components/onboarding/onboarding-styles"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useOnboarding } from "@/lib/hooks/use-onboarding"
import { getStep } from "@/lib/onboarding/onboarding-steps"

type InviteRole = "admin" | "coordinator"

interface InviteRow {
  id: string
  email: string
  role: InviteRole
}

const roleLabels: Record<InviteRole, string> = {
  admin: "Team Leader",
  coordinator: "Coordinator",
}

const makeRow = (): InviteRow => ({
  id: crypto.randomUUID(),
  email: "",
  role: "coordinator",
})

export default function OnboardingTeamPage() {
  const router = useRouter()
  const { complete } = useOnboarding()
  const step = getStep("team")

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [rows, setRows] = useState<InviteRow[]>([makeRow(), makeRow()])
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

    supabase
      .from("workspaces")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setWorkspaceId(data.id)
        setIsLoading(false)
      })
  }, [])

  const handleAddRow = () => setRows((prev) => [...prev, makeRow()])

  const handleRemoveRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const handleUpdateRow = (id: string, patch: Partial<InviteRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const handleSendInvites = async () => {
    setError("")
    if (!workspaceId) {
      setError("Workspace not ready.")
      return
    }

    const valid = rows.filter((r) => r.email.trim().includes("@"))
    if (valid.length === 0) {
      setError("Add at least one email, or skip for now.")
      return
    }

    setIsSubmitting(true)

    const failures: string[] = []
    for (const row of valid) {
      try {
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: row.email.trim(),
            workspaceId,
            role: row.role,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          failures.push(`${row.email}: ${data.error || "Failed"}`)
        }
      } catch (err) {
        failures.push(`${row.email}: ${err instanceof Error ? err.message : "Failed"}`)
      }
    }

    if (failures.length > 0) {
      setError(failures.join("; "))
      setIsSubmitting(false)
      return
    }

    await complete()
    router.push("/tasks")
  }

  const handleSkip = async () => {
    setIsSubmitting(true)
    await complete()
    router.push("/tasks")
  }

  return (
    <OnboardingShell step="team" index={step.index} title={step.title}>
      <div className="flex flex-col gap-[18px]">
        <p className="text-[13px] leading-[1.6] text-[#666]">
          Coordination is more powerful with your team. Invite teammates to collaborate on clients,
          tasks, notes and invoicing — you can always do this later from settings.
        </p>

        <div>
          <label className={labelClass}>Invite people</label>
          <div className="flex flex-col gap-[10px]">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-[8px]">
                <input
                  type="email"
                  value={row.email}
                  onChange={(e) => handleUpdateRow(row.id, { email: e.target.value })}
                  placeholder="teammate@email.com"
                  className={`${inputClass} flex-1`}
                  tabIndex={0}
                />
                <select
                  value={row.role}
                  onChange={(e) =>
                    handleUpdateRow(row.id, { role: e.target.value as InviteRole })
                  }
                  className={`${inputClass} w-[140px]`}
                  tabIndex={0}
                >
                  {(Object.keys(roleLabels) as InviteRole[]).map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-[8px] text-[#bbb] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                    aria-label="Remove row"
                    tabIndex={0}
                  >
                    <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-[6px] self-start rounded-[8px] px-[8px] py-[6px] text-[12px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
              tabIndex={0}
            >
              <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
              Add another
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-[8px] bg-red-50 px-[12px] py-[8px] text-[12px] font-medium text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSendInvites}
          disabled={isSubmitting || isLoading}
          className={primaryBtnClass}
          tabIndex={0}
        >
          {isSubmitting ? "Sending..." : "Send invites"}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={isSubmitting}
          className={secondaryBtnClass}
          tabIndex={0}
        >
          Skip for now
        </button>

        <p className="mt-[8px] text-center text-[11px] leading-[1.5] text-[#aaa]">
          By continuing you agree to our{" "}
          <a href="/terms" className="underline underline-offset-2">
            terms and conditions
          </a>
          .
        </p>
      </div>
    </OnboardingShell>
  )
}
