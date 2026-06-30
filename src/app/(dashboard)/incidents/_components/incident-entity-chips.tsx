"use client"

import { EntityNameRow } from "@/components/entity-name-row"
import type { EntityNameRowVariant } from "@/components/entity-name-row"
import type { Client, StaffMember } from "@/lib/types"
import { cn } from "@/lib/utils"

interface IncidentParticipantChipsProps {
  clientIds: string[]
  clientNames: string
  clients: Client[]
  className?: string
}

export function IncidentParticipantChips({
  clientIds,
  clientNames,
  clients,
  className,
}: IncidentParticipantChipsProps) {
  const items = clientIds.length > 0
    ? clientIds
      .map((id) => clients.find((client) => client.id === id))
      .filter(Boolean)
      .map((client) => ({ id: client!.id, name: client!.displayName, iconText: client!.iconText }))
    : clientNames
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ id: name, name, iconText: undefined as string | undefined }))

  if (items.length === 0) {
    return <span className="text-[13px] text-folk-secondary">—</span>
  }

  if (items.length === 1) {
    const item = items[0]
    return (
      <EntityNameRow
        name={item.name}
        iconText={item.iconText}
        variant="client"
        className={className}
      />
    )
  }

  return (
    <div className={cn("flex flex-col gap-[6px]", className)}>
      {items.map((item) => (
        <EntityNameRow
          key={item.id}
          name={item.name}
          iconText={item.iconText}
          variant="client"
        />
      ))}
    </div>
  )
}

interface IncidentStaffChipProps {
  staffId: string | null
  name: string
  staff: StaffMember[]
  className?: string
}

export function IncidentStaffChip({ staffId, name, staff, className }: IncidentStaffChipProps) {
  const member = staffId ? staff.find((item) => item.id === staffId) : null
  const displayName = member?.name || name

  if (!displayName.trim()) {
    return <span className="text-[13px] text-folk-secondary">—</span>
  }

  return (
    <EntityNameRow
      name={displayName}
      iconText={member?.iconText}
      variant="staff"
      className={className}
    />
  )
}

interface IncidentStaffChipsProps {
  staffIds: string[]
  names: string
  staff: StaffMember[]
  className?: string
}

export function IncidentStaffChips({ staffIds, names, staff, className }: IncidentStaffChipsProps) {
  const items = staffIds.length > 0
    ? staffIds
      .map((id) => staff.find((member) => member.id === id))
      .filter(Boolean)
      .map((member) => ({ id: member!.id, name: member!.name, iconText: member!.iconText }))
    : names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ id: name, name, iconText: undefined as string | undefined }))

  if (items.length === 0) {
    return <span className="text-[13px] text-folk-secondary">—</span>
  }

  if (items.length === 1) {
    const item = items[0]
    return (
      <EntityNameRow
        name={item.name}
        iconText={item.iconText}
        variant="staff"
        className={className}
      />
    )
  }

  return (
    <div className={cn("flex flex-col gap-[6px]", className)}>
      {items.map((item) => (
        <EntityNameRow
          key={item.id}
          name={item.name}
          iconText={item.iconText}
          variant="staff"
        />
      ))}
    </div>
  )
}

export type { EntityNameRowVariant }
