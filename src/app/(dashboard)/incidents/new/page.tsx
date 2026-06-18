"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { AlertTriangle } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageLoader } from "@/components/page-state"
import { useToast } from "@/components/toast"
import { useClients } from "@/lib/hooks/use-clients"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useStaff } from "@/lib/hooks/use-staff"
import { useWorkspace } from "@/lib/workspace-context"
import { IncidentForm } from "../_components/incident-sidebar-form"

export default function NewIncidentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { clients } = useClients()
  const { staff } = useStaff()
  const { currentUserName } = useWorkspace()
  const { canManageIncidents, userId } = usePermissions()
  const { addIncident, isLoading } = useIncidents()
  const [isSaving, setIsSaving] = useState(false)

  const initialClientIds = useMemo(() => {
    const clientId = searchParams.get("client")
    return clientId ? [clientId] : []
  }, [searchParams])

  if (!canManageIncidents && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-[24px]">
        <EmptyState
          icon={AlertTriangle}
          title="Admin access required"
          description="Only workspace admins can report incidents."
          className="py-[40px]"
        />
      </div>
    )
  }

  if (isLoading) return <PageLoader label="Loading…" />

  const handleSubmit = async (input: Parameters<typeof addIncident>[0]) => {
    setIsSaving(true)
    try {
      const created = await addIncident(input, currentUserName || "Admin", userId)
      if (!created) {
        toast("Failed to submit incident report", "error")
        return
      }
      toast("Incident report submitted", "success")
      router.push(`/incidents/${created.id}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[44px] shrink-0 items-center gap-[10px] border-b border-folk-border bg-folk-nav px-[16px]">
        <button
          type="button"
          onClick={() => router.push("/incidents")}
          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border border-folk-border bg-folk-surface text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          aria-label="Back to incidents"
          tabIndex={0}
        >
          <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
        </button>
        <span className="text-[13px] font-semibold text-folk-text">Report incident</span>
      </div>

      <IncidentForm
        mode="add"
        layout="page"
        clients={clients}
        staff={staff}
        initialClientIds={initialClientIds}
        isSaving={isSaving}
        onSubmit={handleSubmit}
        onClose={() => router.push("/incidents")}
      />
    </div>
  )
}
