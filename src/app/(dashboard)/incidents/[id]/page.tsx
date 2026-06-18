"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, ChevronLeft } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageLoader } from "@/components/page-state"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { useToast } from "@/components/toast"
import { profileMainTabScrollClass, profilePageTabBarClass, profilePageTabRowClass } from "@/components/tab-active-indicator"
import { useClients } from "@/lib/hooks/use-clients"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useStaff } from "@/lib/hooks/use-staff"
import {
  formatIncidentDate,
  getIncidentCategoryLabel,
} from "@/lib/incident-definitions"
import { IncidentForm } from "../_components/incident-sidebar-form"
import { IncidentInvestigationForm } from "../_components/incident-investigation-form"

type IncidentDetailTab = "report" | "investigation"

export default function IncidentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { toast } = useToast()
  const { clients } = useClients()
  const { staff } = useStaff()
  const { canViewIncidents, canManageIncidents } = usePermissions()
  const { incidents, isLoading, deleteIncident, updateIncidentInvestigation } = useIncidents()
  const [activeTab, setActiveTab] = useState<IncidentDetailTab>("report")
  const [isSavingInvestigation, setIsSavingInvestigation] = useState(false)

  const incident = useMemo(
    () => incidents.find((item) => item.id === params.id) ?? null,
    [incidents, params.id]
  )

  if (!canViewIncidents && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-[24px]">
        <EmptyState
          icon={AlertTriangle}
          title="Admin access required"
          description="Incident reports are only visible to workspace admins."
          className="py-[40px]"
        />
      </div>
    )
  }

  if (isLoading) return <PageLoader label="Loading incident…" />

  if (!incident) {
    return (
      <div className="flex h-full items-center justify-center px-[24px]">
        <EmptyState
          icon={AlertTriangle}
          title="Incident not found"
          description="This incident report may have been deleted or you may not have access."
          className="py-[40px]"
        />
      </div>
    )
  }

  const title = `${getIncidentCategoryLabel(incident.category)} · ${formatIncidentDate(incident.incidentDate)}`

  const handleDelete = async () => {
    await deleteIncident(incident.id)
    toast("Incident report deleted", "success")
    router.push("/incidents")
  }

  const handleSaveInvestigation = async (input: Parameters<typeof updateIncidentInvestigation>[1]) => {
    setIsSavingInvestigation(true)
    try {
      const saved = await updateIncidentInvestigation(incident.id, input)
      if (!saved) {
        toast("Failed to save investigation", "error")
        return
      }
      toast("Investigation saved", "success")
    } finally {
      setIsSavingInvestigation(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[44px] shrink-0 items-center justify-between gap-[12px] border-b border-folk-border bg-folk-nav px-[16px]">
        <div className="flex min-w-0 items-center gap-[10px]">
          <button
            type="button"
            onClick={() => router.push("/incidents")}
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border border-folk-border bg-folk-surface text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            aria-label="Back to incidents"
            tabIndex={0}
          >
            <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
          <span className="truncate text-[13px] font-semibold text-folk-text">{title}</span>
        </div>
        {canManageIncidents && activeTab === "report" && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-none px-[10px] py-[6px] text-[13px] font-medium text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
            tabIndex={0}
          >
            Delete report
          </button>
        )}
      </div>

      {canManageIncidents && (
        <div className={profilePageTabRowClass()}>
          <div className={profilePageTabBarClass()}>
            <div className={profileMainTabScrollClass()}>
              <ProfileTabButton
                isActive={activeTab === "report"}
                onClick={() => setActiveTab("report")}
                label="Report"
              />
              <ProfileTabButton
                isActive={activeTab === "investigation"}
                onClick={() => setActiveTab("investigation")}
                label="Investigation"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "report" || !canManageIncidents ? (
        <IncidentForm
          mode="view"
          layout="page"
          incident={incident}
          clients={clients}
          staff={staff}
          isSaving={false}
          onSubmit={async () => {}}
          onClose={() => router.push("/incidents")}
        />
      ) : (
        <IncidentInvestigationForm
          incident={incident}
          staff={staff}
          isSaving={isSavingInvestigation}
          onSubmit={handleSaveInvestigation}
        />
      )}
    </div>
  )
}
