import {
  getBillableEntryStatusClasses,
  getBillableEntryStatusLabel,
  type BillableEntryStatus,
} from "@/lib/billable-entries/types"
import { cn } from "@/lib/utils"

interface BillableEntryStatusChipProps {
  status: BillableEntryStatus
  className?: string
}

export function BillableEntryStatusChip({ status, className }: BillableEntryStatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] shrink-0 items-center rounded-full px-[8px] text-[11px] font-medium",
        getBillableEntryStatusClasses(status),
        className,
      )}
    >
      {getBillableEntryStatusLabel(status)}
    </span>
  )
}
