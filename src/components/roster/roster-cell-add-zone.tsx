"use client"

import { Plus } from "lucide-react"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { cn } from "@/lib/utils"

// Responds to hovering the whole day cell (group/cell on RosterDropCell) as
// well as the zone itself, so the affordance appears wherever the pointer is
// in the cell — matching the pre-refactor behaviour.
const ADD_ZONE_HOVER_CLASSES =
  "border border-dashed border-transparent bg-transparent transition-colors hover:border-[#8fa8e0] hover:bg-[#f8faff] group-hover/cell:border-[#8fa8e0] group-hover/cell:bg-[#f8faff] focus-visible:border-[#8fa8e0] focus-visible:bg-[#f8faff]"

interface RosterCellAddZoneProps {
  onAdd: () => void
  /** Cover the entire grid cell (empty day cells). */
  fillCell?: boolean
  compact?: boolean
  label?: string
  className?: string
}

function AddZonePlaceholder({ fillCell }: { fillCell: boolean }) {
  if (fillCell) {
    return <div className="absolute inset-0" aria-hidden />
  }
  return <div className="mt-auto min-h-[36px] w-full flex-1 self-stretch" aria-hidden />
}

export function RosterCellAddZone({
  onAdd,
  fillCell = false,
  compact = false,
  label = "Add shift",
  className,
}: RosterCellAddZoneProps) {
  const { canManageRoster, isLoading } = usePermissions()

  if (isLoading) {
    return <AddZonePlaceholder fillCell={fillCell} />
  }

  if (!canManageRoster) {
    return fillCell ? null : <div className="min-h-[8px] flex-1 shrink-0" aria-hidden />
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onAdd()
  }

  const button = (
    <button
      type="button"
      onClick={handleClick}
      data-roster-add-shift
      aria-label={label}
      className={cn(
        "flex cursor-pointer items-center justify-center",
        ADD_ZONE_HOVER_CLASSES,
        "absolute inset-0 h-full w-full",
        compact ? "rounded-[4px]" : "rounded-[6px]",
        className
      )}
      tabIndex={0}
    >
      <Plus
        className={cn(
          compact ? "h-[12px] w-[12px]" : "h-[18px] w-[18px]",
          "text-folk-text opacity-0 transition-opacity group-hover/zone:opacity-100 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100",
        )}
        strokeWidth={1.5}
      />
    </button>
  )

  if (fillCell) {
    return (
      <div className="group/zone absolute inset-0 z-[1]">
        {button}
      </div>
    )
  }

  return (
    <div className="group/zone relative mt-auto min-h-[36px] w-full flex-1 self-stretch">
      {button}
    </div>
  )
}
