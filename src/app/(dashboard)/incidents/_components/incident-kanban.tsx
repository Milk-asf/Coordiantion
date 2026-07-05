"use client"

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDot,
} from "lucide-react"
import { EntityIcon } from "@/components/entity-icon"
import {
  formatIncidentDate,
  getIncidentCategoryLabel,
  INCIDENT_KANBAN_COLUMNS,
  normalizeInvestigationStatus,
} from "@/lib/incident-definitions"
import { IncidentCategoryChip } from "./incident-category-chip"
import type { Client, Incident, IncidentInvestigationStatus, StaffMember } from "@/lib/types"
import { listViewKanbanScrollClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"

interface IncidentKanbanProps {
  incidents: Incident[]
  clients: Client[]
  staff: StaffMember[]
  canManage: boolean
  onStatusChange: (incidentId: string, status: IncidentInvestigationStatus) => Promise<boolean>
  onOpenIncident: (incidentId: string) => void
}

const KANBAN_COLUMN_THEME: Record<
  IncidentInvestigationStatus,
  { pillClass: string; avatarClass: string }
> = {
  sent: {
    pillClass: "bg-[#f3f4f6] text-[#374151]",
    avatarClass: "bg-[#e5e7eb] text-[#6b7280]",
  },
  in_progress: {
    pillClass: "bg-[#f3e8ff] text-[#7e22ce]",
    avatarClass: "bg-[#f3e8ff] text-[#7e22ce]",
  },
  completed: {
    pillClass: "bg-[#dbeafe] text-[#1d4ed8]",
    avatarClass: "bg-[#dbeafe] text-[#1d4ed8]",
  },
  closed: {
    pillClass: "bg-[#fef3c7] text-[#b45309]",
    avatarClass: "bg-[#fef3c7] text-[#b45309]",
  },
  not_an_incident: {
    pillClass: "bg-[#f8fafc] text-[#64748b]",
    avatarClass: "bg-[#e2e8f0] text-[#64748b]",
  },
}

function resolveDropStatus(overId: string, incidents: Incident[]): IncidentInvestigationStatus | null {
  const column = INCIDENT_KANBAN_COLUMNS.find((item) => item.status === overId)
  if (column) return column.status

  const incident = incidents.find((item) => item.id === overId)
  if (!incident) return null
  return normalizeInvestigationStatus(incident.investigationStatus)
}

function getPrimaryClient(incident: Incident, clients: Client[]) {
  const client = incident.clientIds[0]
    ? clients.find((item) => item.id === incident.clientIds[0])
    : null

  if (client) {
    return {
      name: client.displayName,
      iconText: client.iconText,
    }
  }

  const fallbackName = incident.clientNames.split(",").map((name) => name.trim()).find(Boolean)
  return {
    name: fallbackName || getIncidentCategoryLabel(incident.category),
    iconText: fallbackName?.slice(0, 2).toUpperCase() || "IN",
  }
}

function getCompletedByName(incident: Incident, staff: StaffMember[]) {
  const member = incident.completedByStaffId
    ? staff.find((item) => item.id === incident.completedByStaffId)
    : null
  return member?.name || incident.completedByName || "—"
}

function KanbanPropertyRow({
  icon: Icon,
  children,
  align = "center",
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  children: React.ReactNode
  align?: "center" | "start"
}) {
  return (
    <div className={cn("flex min-w-0 gap-[8px]", align === "start" ? "items-start" : "items-center")}>
      <Icon className="mt-[1px] h-[14px] w-[14px] shrink-0 text-[#9ca3af]" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function KanbanTag({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center rounded-full px-[8px] text-[11px] font-medium", className)}>
      {label}
    </span>
  )
}

function IncidentKanbanCard({
  incident,
  clients,
  staff,
  columnStatus,
  isDragging = false,
  isOverlay = false,
  canManage,
  onOpenIncident,
}: {
  incident: Incident
  clients: Client[]
  staff: StaffMember[]
  columnStatus: IncidentInvestigationStatus
  isDragging?: boolean
  isOverlay?: boolean
  canManage: boolean
  onOpenIncident: (incidentId: string) => void
}) {
  const status = normalizeInvestigationStatus(incident.investigationStatus)
  const isLocked = status === "closed" || status === "not_an_incident" || !canManage
  const primaryClient = getPrimaryClient(incident, clients)
  const theme = KANBAN_COLUMN_THEME[columnStatus]
  const showReportableTag = incident.isReportable
  const showAllegedTag = incident.incidentStatus === "alleged"
  const showTagsRow = showReportableTag || showAllegedTag
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDragging } = useDraggable({
    id: incident.id,
    disabled: isLocked,
    data: { incidentId: incident.id, status },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    if (!isLocked) listeners?.onPointerDown?.(event)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isOverlay) return

    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start) return

    const moved =
      Math.abs(event.clientX - start.x) > 8 ||
      Math.abs(event.clientY - start.y) > 8

    if (moved) return
    onOpenIncident(incident.id)
  }

  const draggableListeners = isLocked ? {} : listeners

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-[6px] border border-[#d9d9d9] bg-white",
        isLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        (isDragging || isActiveDragging) && !isOverlay && "opacity-35",
        isOverlay && "shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
      )}
      {...attributes}
      {...draggableListeners}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (!isOverlay) onOpenIncident(incident.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open incident: ${primaryClient.name}`}
    >
      <div className="flex items-center gap-[10px] px-[12px] py-[9px]">
        <EntityIcon
          text={primaryClient.iconText}
          size="sm"
          backgroundClassName={cn("border-0", theme.avatarClass)}
          textClassName="font-semibold"
        />
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-[1.35] text-[#111827]">
          {primaryClient.name}
        </p>
      </div>

      <div className="mx-[12px] border-t border-[#d9d9d9]" />

      <div className="flex flex-col gap-[7px] px-[12px] py-[9px]">
        <KanbanPropertyRow icon={Building2} align="start">
          <IncidentCategoryChip category={incident.category} size="sm" />
        </KanbanPropertyRow>

        <KanbanPropertyRow icon={Briefcase}>
          <span className="truncate text-[12px] leading-[1.4] text-[#374151]">
            {getCompletedByName(incident, staff)}
          </span>
        </KanbanPropertyRow>

        {showTagsRow && (
          <KanbanPropertyRow icon={CircleDot} align="start">
            <div className="flex flex-wrap gap-[6px]">
              {showReportableTag && (
                <KanbanTag label="Reportable" className="bg-[#dbeafe] text-[#1d4ed8]" />
              )}
              {showAllegedTag && (
                <KanbanTag label="Alleged" className="bg-[#fef3c7] text-[#b45309]" />
              )}
            </div>
          </KanbanPropertyRow>
        )}

        <KanbanPropertyRow icon={CalendarDays}>
          <span className="truncate text-[12px] leading-[1.4] text-[#374151]">
            {formatIncidentDate(incident.incidentDate)}
          </span>
        </KanbanPropertyRow>
      </div>
    </div>
  )
}

function IncidentKanbanColumn({
  status,
  label,
  incidents,
  clients,
  staff,
  canManage,
  onOpenIncident,
}: {
  status: IncidentInvestigationStatus
  label: string
  incidents: Incident[]
  clients: Client[]
  staff: StaffMember[]
  canManage: boolean
  onOpenIncident: (incidentId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const theme = KANBAN_COLUMN_THEME[status]

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-[10px] flex items-center gap-[6px] px-[1px]">
        <span className={cn("inline-flex h-[22px] items-center rounded-full px-[9px] text-[12px] font-medium leading-none", theme.pillClass)}>
          {label}
        </span>
        <span className="text-[13px] font-normal text-[#6b7280]">{incidents.length}</span>
        <ChevronDown className="h-[12px] w-[12px] text-[#9ca3af]" strokeWidth={2} />
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-col gap-[8px] transition-colors",
          isOver && canManage && status !== "closed" && "rounded-[6px] bg-[#f3f4f6]/60",
        )}
      >
        {incidents.map((incident) => (
          <IncidentKanbanCard
            key={incident.id}
            incident={incident}
            clients={clients}
            staff={staff}
            columnStatus={status}
            canManage={canManage}
            onOpenIncident={onOpenIncident}
          />
        ))}
      </div>
    </div>
  )
}

export function IncidentKanban({
  incidents,
  clients,
  staff,
  canManage,
  onStatusChange,
  onOpenIncident,
}: IncidentKanbanProps) {
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const isDraggingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleOpenIncident = (incidentId: string) => {
    if (isDraggingRef.current) return
    onOpenIncident(incidentId)
  }

  const incidentsByStatus = useMemo(() => {
    const grouped: Record<IncidentInvestigationStatus, Incident[]> = {
      sent: [],
      in_progress: [],
      completed: [],
      closed: [],
      not_an_incident: [],
    }

    for (const incident of incidents) {
      const status = normalizeInvestigationStatus(incident.investigationStatus)
      grouped[status].push(incident)
    }

    return grouped
  }, [incidents])

  const activeIncident = activeIncidentId
    ? incidents.find((incident) => incident.id === activeIncidentId) ?? null
    : null

  const activeColumnStatus = activeIncident
    ? normalizeInvestigationStatus(activeIncident.investigationStatus)
    : "sent"

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true
    setActiveIncidentId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveIncidentId(null)

    try {
      if (!canManage || isUpdating) return

      const incidentId = String(event.active.id)
      const overId = event.over?.id ? String(event.over.id) : null
      if (!overId) return

      const incident = incidents.find((item) => item.id === incidentId)
      if (!incident) return

      const targetStatus = resolveDropStatus(overId, incidents)
      if (!targetStatus) return

      const currentStatus = normalizeInvestigationStatus(incident.investigationStatus)
      if (currentStatus === targetStatus) return

      setIsUpdating(true)
      await onStatusChange(incidentId, targetStatus)
    } finally {
      isDraggingRef.current = false
      setIsUpdating(false)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={listViewKanbanScrollClass()}>
        {INCIDENT_KANBAN_COLUMNS.map((column) => (
          <IncidentKanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            incidents={incidentsByStatus[column.status]}
            clients={clients}
            staff={staff}
            canManage={canManage}
            onOpenIncident={handleOpenIncident}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeIncident ? (
          <div className="w-[280px]">
            <IncidentKanbanCard
              incident={activeIncident}
              clients={clients}
              staff={staff}
              columnStatus={activeColumnStatus}
              isOverlay
              canManage={canManage}
              onOpenIncident={handleOpenIncident}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
