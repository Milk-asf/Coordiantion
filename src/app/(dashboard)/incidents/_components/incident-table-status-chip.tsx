import {
  getIncidentStatusChipClass,
  getIncidentStatusLabel,
  getInvestigationStatusChipClass,
  getInvestigationStatusLabel,
  normalizeInvestigationStatus,
} from "@/lib/incident-definitions"
import type { Incident } from "@/lib/types"
import { cn } from "@/lib/utils"

interface IncidentTableStatusChipProps {
  incident: Incident
  variant?: "report" | "investigation"
  className?: string
}

export function IncidentTableStatusChip({
  incident,
  variant = "investigation",
  className,
}: IncidentTableStatusChipProps) {
  const isInvestigation = variant === "investigation"
  const label = isInvestigation
    ? getInvestigationStatusLabel(normalizeInvestigationStatus(incident.investigationStatus))
    : getIncidentStatusLabel(incident.incidentStatus)
  const chipClass = isInvestigation
    ? getInvestigationStatusChipClass(normalizeInvestigationStatus(incident.investigationStatus))
    : getIncidentStatusChipClass(incident.incidentStatus)

  return (
    <span className={cn(
      "inline-flex h-[22px] max-w-full items-center truncate rounded-[6px] px-[8px] text-[11px] font-medium",
      chipClass,
      className
    )}>
      {label}
    </span>
  )
}
