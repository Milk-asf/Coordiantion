import type { ComponentType } from "react"
import { Clock, Tag } from "lucide-react"
import { profileTaskGridClassName, profileTaskGridTemplate } from "@/app/(dashboard)/tasks/_components/task-helpers"

interface ProfileTaskListHeaderProps {
  trailingIcon: ComponentType<{ className?: string; strokeWidth?: number }>
  trailingLabel: string
}

function HeaderIcon({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-[4px]">
      <Icon className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ProfileTaskListHeader({ trailingIcon: TrailingIcon, trailingLabel }: ProfileTaskListHeaderProps) {
  return (
    <div
      className={`${profileTaskGridClassName} sticky top-0 z-10 border-[#d9d9d9] bg-white py-[8px]`}
      style={{ gridTemplateColumns: profileTaskGridTemplate }}
    >
      <div aria-hidden="true" />
      <div aria-hidden="true" />
      <HeaderIcon icon={Tag} label="Charge" />
      <HeaderIcon icon={Clock} label="Time" />
      <HeaderIcon icon={TrailingIcon} label={trailingLabel} />
      <div aria-hidden="true" />
    </div>
  )
}
