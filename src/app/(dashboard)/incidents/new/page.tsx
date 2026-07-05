"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { PageTitleBar } from "@/components/page-title-bar"
import { EmptyState } from "@/components/empty-state"
import { PageLoader } from "@/components/page-state"
import { useToast } from "@/components/toast"
import { useClients } from "@/lib/hooks/use-clients"
import { useForms } from "@/lib/hooks/use-forms"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useStaff } from "@/lib/hooks/use-staff"
import { useWorkspace } from "@/lib/workspace-context"
import { IncidentForm } from "../_components/incident-sidebar-form"
import { IncidentCustomForm } from "../_components/incident-custom-form"

export default function NewIncidentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { clients } = useClients()
  const { staff } = useStaff()
  const { currentUserName } = useWorkspace()
  const { canReportIncidents, userId } = usePermissions()
  const { addIncident, isLoading } = useIncidents()
  const { incidentFormId, getForm, addSubmission, isLoading: isFormsLoading } = useForms()
  const [isSaving, setIsSaving] = useState(false)

  const boundForm = incidentFormId ? getForm(incidentFormId) : undefined
  const customForm = boundForm && boundForm.status === "published" ? boundForm : null

  const initialClientIds = useMemo(() => {
    const clientId = searchParams.get("client")
    return clientId ? [clientId] : []
  }, [searchParams])

  if (!canReportIncidents && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-[24px]">
        <EmptyState
          icon={AlertTriangle}
          title="No access"
          description="You do not have permission to report incidents."
          className="py-[40px]"
        />
      </div>
    )
  }

  if (isLoading || isFormsLoading) return <PageLoader label="Loading…" />

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

  // Custom form path: create the incident first (source of truth), then record the full response best-effort.
  const handleCustomSubmit = async (input: Parameters<typeof addIncident>[0], answers: Record<string, unknown>) => {
    if (!customForm) return
    setIsSaving(true)
    try {
      const created = await addIncident(input, currentUserName || "Admin", userId)
      if (!created) {
        toast("Failed to submit incident report", "error")
        return
      }
      try {
        await addSubmission(customForm.id, { answers, submittedByName: currentUserName || "Admin", submittedByStaffId: userId })
      } catch {
        // The incident is saved; a failed submission record shouldn't block the user.
      }
      toast("Incident report submitted", "success")
      router.push(`/incidents/${created.id}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <PageTitleBar
        title="Report incident"
        onBack={() => router.push("/incidents")}
        backLabel="Back to incidents"
      />

      {customForm ? (
        <IncidentCustomForm
          form={customForm}
          clients={clients}
          staff={staff}
          initialClientIds={initialClientIds}
          isSaving={isSaving}
          onSubmit={handleCustomSubmit}
          onClose={() => router.push("/incidents")}
        />
      ) : (
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
      )}
    </div>
  )
}
