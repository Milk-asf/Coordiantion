import {
  getInvestigationStatusChipClass,
  getInvestigationStatusLabel,
  normalizeInvestigationStatus,
} from "@/lib/incident-definitions"
import type { IncidentInvestigationStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface InvestigationStatusChipProps {
  status: IncidentInvestigationStatus | string
  className?: string
}

export function InvestigationStatusChip({ status, className }: InvestigationStatusChipProps) {
  const normalized = normalizeInvestigationStatus(status)

  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center truncate rounded-[6px] px-[8px] text-[11px] font-medium",
        getInvestigationStatusChipClass(normalized),
        className,
      )}
    >
      {getInvestigationStatusLabel(normalized)}
    </span>
  )
}
