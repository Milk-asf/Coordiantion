"use client"

import { Search, X } from "lucide-react"
import { IconButton } from "@/components/icon-button"
import { FloatingSidePanel } from "@/components/floating-side-panel"
import type { IncidentClosureInput, IncidentInvestigationInput } from "@/lib/hooks/use-incidents"
import type { Incident, StaffMember } from "@/lib/types"
import { cn } from "@/lib/utils"
import { IncidentInvestigationForm } from "./incident-investigation-form"

const PANEL_WIDTH = 520

interface IncidentInvestigationPanelProps {
  incident: Incident
  staff: StaffMember[]
  isSaving: boolean
  isClosing?: boolean
  onSubmit: (input: IncidentInvestigationInput) => Promise<boolean>
  onCloseIncident?: (input: IncidentClosureInput) => Promise<boolean>
  onClose: () => void
}

export function IncidentInvestigationPanel({
  incident,
  staff,
  isSaving,
  isClosing = false,
  onSubmit,
  onCloseIncident,
  onClose,
}: IncidentInvestigationPanelProps) {
  return (
    <>
      <FloatingSidePanel width={PANEL_WIDTH} className="z-[60]">
        <div data-incident-investigation-panel className="flex h-full min-h-0 flex-col">
          <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[12px]">
            <div className="flex min-w-0 items-center gap-[8px]">
              <Search className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.75} />
              <span className="truncate text-[13px] font-semibold text-folk-text">Investigation</span>
            </div>
            <IconButton
              onClick={onClose}
              tooltip="Close investigation"
              className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border-0 text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              tabIndex={0}
            >
              <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </IconButton>
          </div>

          <IncidentInvestigationForm
            layout="panel"
            incident={incident}
            staff={staff}
            isSaving={isSaving}
            isClosing={isClosing}
            onSubmit={onSubmit}
            onCloseIncident={onCloseIncident}
            onClose={onClose}
          />
        </div>
      </FloatingSidePanel>
    </>
  )
}

export function investigationPanelButtonClass(isActive: boolean) {
  return cn(
    "rounded-[6px] border px-[10px] py-[6px] text-[13px] font-medium transition-colors",
    isActive
      ? "border-folk-border bg-folk-hover text-folk-text"
      : "border-folk-border bg-folk-surface text-folk-text hover:bg-folk-hover"
  )
}
