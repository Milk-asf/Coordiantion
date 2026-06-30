import { TIMESHEET_STATUS_LABELS, type TimesheetStatus } from "@/lib/timesheets/types"
import { cn } from "@/lib/utils"

const STATUS_CHIP_CLASS: Record<TimesheetStatus, string> = {
  draft: "bg-folk-hover text-folk-secondary",
  sent: "bg-[#dbeafe] text-[#1d4ed8]",
  returned: "bg-[#fef3c7] text-[#b45309]",
  approved: "bg-[#e7f5ec] text-[#1a7f43]",
}

interface TimesheetStatusChipProps {
  status: TimesheetStatus
  className?: string
}

export function TimesheetStatusChip({ status, className }: TimesheetStatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] shrink-0 items-center rounded-full px-[8px] text-[11px] font-medium",
        STATUS_CHIP_CLASS[status],
        className,
      )}
    >
      {TIMESHEET_STATUS_LABELS[status]}
    </span>
  )
}
