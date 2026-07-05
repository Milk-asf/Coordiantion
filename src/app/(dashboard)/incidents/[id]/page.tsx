"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Download, Printer } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { IconButton } from "@/components/icon-button"
import { PanelToggleButton } from "@/components/panel-toggle-button"
import { PageLoader } from "@/components/page-state"
import { ProfileRecordHeader } from "@/components/profile-record-header"
import { useToast } from "@/components/toast"
import {
  folkNavIconButtonClass,
  folkNavPrimaryTextClass,
} from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"
import { useClients } from "@/lib/hooks/use-clients"
import { useIncidents } from "@/lib/hooks/use-incidents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useStaff } from "@/lib/hooks/use-staff"
import type { Incident } from "@/lib/types"
import { useListReturnBack } from "@/lib/lists/list-return"
import { getIncidentDisplayId } from "@/lib/incident-definitions"
import { IncidentForm } from "../_components/incident-sidebar-form"
import { IncidentInvestigationForm } from "../_components/incident-investigation-form"

function downloadIncidentReport(incident: Incident) {
  const blob = new Blob([JSON.stringify(incident, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${getIncidentDisplayId(incident)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function IncidentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { clients } = useClients()
  const { staff } = useStaff()
  const { canViewIncidents, canManageIncidents, userId, isSuperAdmin } = usePermissions()
  const { incidents, isLoading, updateIncidentInvestigation, closeIncident, markIncidentViewed } = useIncidents()
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const [isSavingInvestigation, setIsSavingInvestigation] = useState(false)
  const [isClosingIncident, setIsClosingIncident] = useState(false)
  const isResizing = useRef(false)

  const fromKanban = searchParams.get("from") === "kanban"
  const { onBack: handleProfileBack, backLabel: profileBackLabel } = useListReturnBack({
    path: fromKanban ? "/incidents?view=kanban" : "/incidents",
    label: "Back to incidents",
  })

  const incident = useMemo(
    () => incidents.find((item) => item.id === params.id) ?? null,
    [incidents, params.id]
  )

  useEffect(() => {
    if (incident) markIncidentViewed(incident.id)
  }, [incident, markIncidentViewed])

  const handleMouseDown = useCallback(() => {
    isResizing.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - event.clientX
      setSidebarWidth(Math.max(280, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [])

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

  const handleSaveInvestigation = async (input: Parameters<typeof updateIncidentInvestigation>[1]) => {
    setIsSavingInvestigation(true)
    try {
      const { incident: saved, error } = await updateIncidentInvestigation(incident.id, input)
      if (!saved) {
        toast(error || "Failed to save investigation", "error")
        return false
      }
      if (error) {
        toast(error, "error")
        return true
      }
      toast(
        saved.investigationStatus === "completed" ? "Investigation completed" : "Investigation saved",
        "success",
      )
      return true
    } finally {
      setIsSavingInvestigation(false)
    }
  }

  const handleCloseIncident = async (input: Parameters<typeof closeIncident>[1]) => {
    setIsClosingIncident(true)
    try {
      const saved = await closeIncident(incident.id, input, { userId, isSuperAdmin })
      if (!saved) {
        toast(
          "Unable to archive incident. Complete the investigation before quality checking.",
          "error",
        )
        return false
      }
      toast("Incident archived", "success")
      return true
    } finally {
      setIsClosingIncident(false)
    }
  }

  const showInvestigationSidebar = canManageIncidents && isSidebarVisible

  return (
    <div className="flex h-full flex-col bg-white">
      <ProfileRecordHeader
        name={
          <span className="flex min-w-0 items-center gap-[8px]">
            <span className={folkNavPrimaryTextClass()}>Incident report</span>
            <span className="font-mono text-[13px] font-normal text-folk-secondary">
              {getIncidentDisplayId(incident)}
            </span>
          </span>
        }
        onBack={handleProfileBack}
        backLabel={profileBackLabel}
        actions={
          <>
            {canManageIncidents && !isSidebarVisible && (
              <PanelToggleButton
                side="right"
                isOpen={false}
                onClick={() => setIsSidebarVisible(true)}
                ariaLabel="Show investigation"
                tooltip="Show investigation"
              />
            )}
            <IconButton
              type="button"
              onClick={() => window.print()}
              tooltip="Print incident report"
              className={cn(
                "flex h-[24px] w-[24px] items-center justify-center",
                folkNavIconButtonClass()
              )}
              tabIndex={0}
            >
              <Printer className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </IconButton>
            <IconButton
              type="button"
              onClick={() => downloadIncidentReport(incident)}
              tooltip="Download incident report"
              className={cn(
                "flex h-[24px] w-[24px] items-center justify-center",
                folkNavIconButtonClass()
              )}
              tabIndex={0}
            >
              <Download className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </IconButton>
          </>
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto bg-white">
            <IncidentForm
              mode="view"
              layout="profile"
              incident={incident}
              clients={clients}
              staff={staff}
              isSaving={false}
              onSubmit={async () => {}}
              onClose={() => {}}
            />
          </div>
        </div>

        {showInvestigationSidebar && (
          <div className="flex min-h-0 shrink-0 border-l border-folk-border">
            <div
              onMouseDown={handleMouseDown}
              className="w-[4px] shrink-0 cursor-col-resize self-stretch transition-colors hover:bg-[var(--folk-border-subtle)]"
              aria-hidden="true"
            />
            <div className="flex h-full min-h-0 flex-col bg-folk-surface" style={{ width: sidebarWidth }}>
              <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border px-[12px]">
                <h2 className="text-[13px] font-medium text-folk-text">Investigation</h2>
                <PanelToggleButton
                  side="right"
                  isOpen
                  onClick={() => setIsSidebarVisible(false)}
                  ariaLabel="Hide investigation"
                  tooltip="Hide investigation"
                />
              </div>
              <IncidentInvestigationForm
                layout="panel"
                incident={incident}
                staff={staff}
                isSaving={isSavingInvestigation}
                isClosing={isClosingIncident}
                onSubmit={handleSaveInvestigation}
                onCloseIncident={handleCloseIncident}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
