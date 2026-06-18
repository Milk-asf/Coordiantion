"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { useStaff } from "@/lib/hooks/use-staff"
import { useClients } from "@/lib/hooks/use-clients"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { resolveSessionType } from "@/lib/roster/settings"
import type { RosterShift, RosterShiftCancelledBy, RosterShiftInput, RosterShiftStatus } from "@/lib/roster/types"
import { endOfWeek, shiftDurationHours, startOfWeek, toDateStr } from "@/lib/roster/week-utils"
import { normalizeShiftChargeTypes, primaryShiftChargeType } from "@/lib/roster/charge-utils"
import { normalizeTimeInput } from "@/lib/roster/shift-utils"

interface RosterShiftRow {
  id: string
  workspace_id: string
  staff_id: string | null
  client_id: string | null
  shift_date: string
  start_time: string
  end_time: string
  title: string | null
  session_type: string | null
  notes: string | null
  admin_notes: string | null
  location: string | null
  charge_type: string | null
  charge_types: string[] | null
  status: RosterShiftStatus | null
  cancelled_by: RosterShiftCancelledBy | null
  cancellation_reason: string | null
  shift_string_id: string | null
  shift_string_order: number | null
}

function storageKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-roster-${workspaceId}` : "workspace-roster"
}

function formatDbTime(value: string): string {
  return value.slice(0, 5)
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function normalizeSessionType(value: unknown): string {
  return resolveSessionType(value)
}

function normalizeCancelledBy(value: unknown): RosterShiftCancelledBy | null {
  if (value === "client" || value === "organisation") return value
  return null
}

function migrateLegacyShift(raw: Record<string, unknown>, staffName: string, clientName: string): RosterShift {
  const resolvedStaffName = String(raw.staffName ?? staffName)
  const resolvedClientName = String(raw.clientName ?? clientName)
  return {
    id: String(raw.id),
    staffId: typeof raw.staffId === "string" && raw.staffId ? raw.staffId : "",
    staffName: resolvedStaffName,
    staffIconText: String(raw.staffIconText ?? initialsFromName(resolvedStaffName)),
    clientId: typeof raw.clientId === "string" && raw.clientId ? raw.clientId : "",
    clientName: resolvedClientName,
    clientIconText: String(raw.clientIconText ?? initialsFromName(resolvedClientName)),
    date: String(raw.date),
    startTime: String(raw.startTime),
    endTime: String(raw.endTime),
    title: typeof raw.title === "string" ? raw.title : "",
    sessionType: normalizeSessionType(raw.sessionType),
    notes: typeof raw.notes === "string" ? raw.notes : "",
    adminNotes: typeof raw.adminNotes === "string" ? raw.adminNotes : "",
    location: typeof raw.location === "string" ? raw.location : "",
    chargeTypes: normalizeShiftChargeTypes(raw.chargeTypes, typeof raw.chargeType === "string" ? raw.chargeType : ""),
    status: (raw.status as RosterShiftStatus) || "scheduled",
    cancelledBy: normalizeCancelledBy(raw.cancelledBy),
    cancellationReason: typeof raw.cancellationReason === "string" ? raw.cancellationReason : "",
    shiftStringId: typeof raw.shiftStringId === "string" && raw.shiftStringId ? raw.shiftStringId : null,
    shiftStringOrder: typeof raw.shiftStringOrder === "number" ? raw.shiftStringOrder : 0,
  }
}

function loadLocalShifts(workspaceId: string | undefined): RosterShift[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, unknown>[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((entry) => migrateLegacyShift(entry, "Staff", "Client"))
  } catch {
    return []
  }
}

function saveLocalShifts(workspaceId: string | undefined, shifts: RosterShift[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(shifts))
}

interface RosterContextValue {
  shifts: RosterShift[]
  isLoading: boolean
  fetchError: string | null
  activeStaff: ReturnType<typeof useStaff>["staff"]
  activeClients: ReturnType<typeof useClients>["clients"]
  getShiftsForWeek: (weekStart: Date) => RosterShift[]
  getStaffHoursForWeek: (weekStart: Date, staffId: string) => number
  getClientHoursForWeek: (weekStart: Date, clientId: string) => number
  addShift: (input: RosterShiftInput) => Promise<RosterShift | null>
  updateShift: (id: string, input: Partial<RosterShiftInput>) => Promise<boolean>
  deleteShift: (id: string) => Promise<boolean>
  duplicateShift: (id: string, date?: string) => Promise<RosterShift | null>
  copyWeek: (weekStart: Date) => Promise<number>
  refetch: () => Promise<void>
}

const RosterContext = createContext<RosterContextValue | null>(null)

export function RosterProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const { staff } = useStaff()
  const { clients } = useClients()
  const { canManageWorkspaceSettings } = usePermissions()
  const [shifts, setShifts] = useState<RosterShift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const staffById = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff])
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])

  const enrichShift = useCallback((row: RosterShiftRow): RosterShift => {
    const staffId = row.staff_id ?? ""
    const clientId = row.client_id ?? ""
    const member = staffId ? staffById.get(staffId) : undefined
    const client = clientId ? clientsById.get(clientId) : undefined
    return {
      id: row.id,
      staffId,
      staffName: member?.name ?? (staffId ? "Unknown staff" : ""),
      staffIconText: member?.iconText ?? initialsFromName(member?.name ?? "Staff"),
      clientId,
      clientName: client?.displayName ?? (clientId ? "Unknown client" : ""),
      clientIconText: client?.iconText ?? initialsFromName(client?.displayName ?? "Client"),
      date: row.shift_date,
      startTime: formatDbTime(row.start_time),
      endTime: formatDbTime(row.end_time),
      title: row.title ?? "",
      sessionType: normalizeSessionType(row.session_type),
      notes: row.notes ?? "",
      adminNotes: row.admin_notes ?? "",
      location: row.location ?? "",
      chargeTypes: normalizeShiftChargeTypes(row.charge_types, row.charge_type),
      status: row.status ?? "scheduled",
      cancelledBy: normalizeCancelledBy(row.cancelled_by),
      cancellationReason: row.cancellation_reason ?? "",
      shiftStringId: row.shift_string_id ?? null,
      shiftStringOrder: row.shift_string_order ?? 0,
    }
  }, [clientsById, staffById])

  const enrichLocalShift = useCallback((shift: RosterShift): RosterShift => {
    const member = shift.staffId ? staffById.get(shift.staffId) : undefined
    const client = shift.clientId ? clientsById.get(shift.clientId) : undefined
    return {
      ...shift,
      staffName: member?.name ?? shift.staffName,
      staffIconText: member?.iconText ?? shift.staffIconText ?? initialsFromName(member?.name ?? shift.staffName ?? "Staff"),
      clientName: client?.displayName ?? shift.clientName,
      clientIconText: client?.iconText ?? shift.clientIconText ?? initialsFromName(client?.displayName ?? shift.clientName ?? "Client"),
    }
  }, [clientsById, staffById])

  const fetchShifts = useCallback(async () => {
    if (!activeWorkspace) {
      setShifts([])
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setShifts(loadLocalShifts(activeWorkspace.id).map(enrichLocalShift))
      setFetchError(null)
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setShifts(loadLocalShifts(activeWorkspace.id).map(enrichLocalShift))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)

    const { data, error } = await supabase
      .from("roster_shifts")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      setFetchError(error.message)
      setShifts(loadLocalShifts(activeWorkspace.id).map(enrichLocalShift))
    } else {
      setShifts((data as RosterShiftRow[] | null)?.map(enrichShift) ?? [])
    }

    setIsLoading(false)
  }, [activeWorkspace, enrichLocalShift, enrichShift])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  useEffect(() => {
    setShifts((current) => current.map(enrichLocalShift))
  }, [enrichLocalShift])

  const persistLocal = useCallback((next: RosterShift[]) => {
    setShifts(next)
    saveLocalShifts(activeWorkspace?.id, next)
  }, [activeWorkspace?.id])

  const buildShiftFromInput = useCallback((input: RosterShiftInput, id?: string): RosterShift | null => {
    const staffId = input.staffId?.trim() ?? ""
    const clientId = input.clientId?.trim() ?? ""
    if (!staffId && !clientId) return null

    const member = staffId ? staffById.get(staffId) : undefined
    const client = clientId ? clientsById.get(clientId) : undefined
    if (staffId && !member) return null
    if (clientId && !client) return null

    return {
      id: id ?? crypto.randomUUID(),
      staffId,
      staffName: member?.name ?? "",
      staffIconText: member?.iconText ?? initialsFromName(member?.name ?? "Staff"),
      clientId,
      clientName: client?.displayName ?? "",
      clientIconText: client?.iconText ?? initialsFromName(client?.displayName ?? "Client"),
      date: input.date,
      startTime: normalizeTimeInput(input.startTime),
      endTime: normalizeTimeInput(input.endTime),
      title: input.title?.trim() ?? "",
      sessionType: normalizeSessionType(input.sessionType),
      notes: input.notes?.trim() ?? "",
      adminNotes: input.adminNotes?.trim() ?? "",
      location: input.location?.trim() ?? "",
      chargeTypes: normalizeShiftChargeTypes(input.chargeTypes),
      status: input.status ?? "scheduled",
      cancelledBy: input.status === "cancelled" ? normalizeCancelledBy(input.cancelledBy) : null,
      cancellationReason: input.status === "cancelled" ? (input.cancellationReason?.trim() ?? "") : "",
      shiftStringId: input.shiftStringId ?? null,
      shiftStringOrder: input.shiftStringId ? (input.shiftStringOrder ?? 0) : 0,
    }
  }, [clientsById, staffById])

  const addShift = useCallback(async (input: RosterShiftInput) => {
    const shift = buildShiftFromInput(input)
    if (!shift || !activeWorkspace) return null

    if (!isSupabaseConfigured()) {
      persistLocal([...shifts, shift])
      return shift
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal([...shifts, shift])
      return shift
    }

    const { data, error } = await supabase
      .from("roster_shifts")
      .insert({
        workspace_id: activeWorkspace.id,
        staff_id: shift.staffId || null,
        client_id: shift.clientId || null,
        shift_date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        title: shift.title,
        session_type: shift.sessionType,
        notes: shift.notes,
        admin_notes: shift.adminNotes,
        location: shift.location,
        charge_type: primaryShiftChargeType(shift.chargeTypes),
        charge_types: shift.chargeTypes,
        status: shift.status,
        cancelled_by: shift.cancelledBy,
        cancellation_reason: shift.cancellationReason,
        shift_string_id: shift.shiftStringId,
        shift_string_order: shift.shiftStringOrder,
      })
      .select("*")
      .single()

    if (error || !data) {
      persistLocal([...shifts, shift])
      return shift
    }

    const created = enrichShift(data as RosterShiftRow)
    setShifts((prev) => [...prev, created])
    return created
  }, [activeWorkspace, buildShiftFromInput, enrichShift, persistLocal, shifts])

  const updateShift = useCallback(async (id: string, input: Partial<RosterShiftInput>) => {
    const existing = shifts.find((shift) => shift.id === id)
    if (!existing) return false

    const mergedInput: RosterShiftInput = {
      staffId: "staffId" in input ? (input.staffId ?? "") : existing.staffId,
      clientId: "clientId" in input ? (input.clientId ?? "") : existing.clientId,
      date: input.date ?? existing.date,
      startTime: input.startTime ?? existing.startTime,
      endTime: input.endTime ?? existing.endTime,
      title: input.title ?? existing.title,
      sessionType: input.sessionType ?? existing.sessionType,
      notes: input.notes ?? existing.notes,
      adminNotes: input.adminNotes ?? existing.adminNotes,
      location: input.location ?? existing.location,
      chargeTypes: input.chargeTypes ?? existing.chargeTypes,
      status: input.status ?? existing.status,
      cancelledBy: "cancelledBy" in input ? (input.cancelledBy ?? null) : existing.cancelledBy,
      cancellationReason: input.cancellationReason ?? existing.cancellationReason,
      shiftStringId: "shiftStringId" in input ? (input.shiftStringId ?? null) : existing.shiftStringId,
      shiftStringOrder: input.shiftStringOrder ?? existing.shiftStringOrder,
    }

    if (mergedInput.status !== "cancelled") {
      mergedInput.cancelledBy = null
      mergedInput.cancellationReason = ""
    } else if (mergedInput.status === "cancelled" && !mergedInput.cancelledBy && existing.cancelledBy) {
      mergedInput.cancelledBy = existing.cancelledBy
      mergedInput.cancellationReason = mergedInput.cancellationReason || existing.cancellationReason
    }

    const updated = buildShiftFromInput(mergedInput, id)
    if (!updated) return false

    if (!isSupabaseConfigured()) {
      persistLocal(shifts.map((shift) => (shift.id === id ? updated : shift)))
      return true
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal(shifts.map((shift) => (shift.id === id ? updated : shift)))
      return true
    }

    const { data, error } = await supabase
      .from("roster_shifts")
      .update({
        staff_id: updated.staffId || null,
        client_id: updated.clientId || null,
        shift_date: updated.date,
        start_time: updated.startTime,
        end_time: updated.endTime,
        title: updated.title,
        session_type: updated.sessionType,
        notes: updated.notes,
        admin_notes: updated.adminNotes,
        location: updated.location,
        charge_type: primaryShiftChargeType(updated.chargeTypes),
        charge_types: updated.chargeTypes,
        status: updated.status,
        cancelled_by: updated.cancelledBy,
        cancellation_reason: updated.cancellationReason,
        shift_string_id: updated.shiftStringId,
        shift_string_order: updated.shiftStringOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      persistLocal(shifts.map((shift) => (shift.id === id ? updated : shift)))
      return true
    }

    const saved = enrichShift(data as RosterShiftRow)
    setShifts((prev) => prev.map((shift) => (shift.id === id ? saved : shift)))
    return true
  }, [buildShiftFromInput, enrichShift, persistLocal, shifts])

  const deleteShift = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) {
      persistLocal(shifts.filter((shift) => shift.id !== id))
      return true
    }

    const supabase = createClient()
    if (!supabase) {
      persistLocal(shifts.filter((shift) => shift.id !== id))
      return true
    }

    const { error } = await supabase.from("roster_shifts").delete().eq("id", id)
    if (error) {
      persistLocal(shifts.filter((shift) => shift.id !== id))
      return true
    }

    setShifts((prev) => prev.filter((shift) => shift.id !== id))
    return true
  }, [persistLocal, shifts])

  const duplicateShift = useCallback(async (id: string, date?: string) => {
    const existing = shifts.find((shift) => shift.id === id)
    if (!existing) return null

    return addShift({
      staffId: existing.staffId,
      clientId: existing.clientId,
      date: date ?? existing.date,
      startTime: existing.startTime,
      endTime: existing.endTime,
      title: existing.title,
      sessionType: existing.sessionType,
      notes: existing.notes,
      adminNotes: existing.adminNotes,
      location: existing.location,
      chargeTypes: existing.chargeTypes,
      status: "scheduled",
      shiftStringId: null,
      shiftStringOrder: 0,
    })
  }, [addShift, shifts])

  const copyWeek = useCallback(async (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart)
    const startStr = toDateStr(weekStart)
    const endStr = toDateStr(weekEnd)
    const nextWeekStart = new Date(weekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)

    const weekShifts = shifts.filter((shift) => shift.date >= startStr && shift.date <= endStr && shift.status !== "cancelled")
    let created = 0

    for (const shift of weekShifts) {
      const sourceDate = new Date(`${shift.date}T00:00:00`)
      const offsetDays = Math.round((sourceDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
      const targetDate = new Date(nextWeekStart)
      targetDate.setDate(nextWeekStart.getDate() + offsetDays)

      const result = await addShift({
        staffId: shift.staffId,
        clientId: shift.clientId,
        date: toDateStr(targetDate),
        startTime: shift.startTime,
        endTime: shift.endTime,
        title: shift.title,
        sessionType: shift.sessionType,
        notes: shift.notes,
        adminNotes: shift.adminNotes,
        location: shift.location,
        chargeTypes: shift.chargeTypes,
        status: "scheduled",
        shiftStringId: shift.shiftStringId,
        shiftStringOrder: shift.shiftStringOrder,
      })

      if (result) created += 1
    }

    return created
  }, [addShift, shifts])

  const getShiftsForWeek = useCallback((weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart)
    const startStr = toDateStr(weekStart)
    const endStr = toDateStr(weekEnd)
    return shifts.filter((shift) => shift.date >= startStr && shift.date <= endStr)
  }, [shifts])

  const getStaffHoursForWeek = useCallback((weekStart: Date, staffId: string) => {
    return getShiftsForWeek(weekStart)
      .filter((shift) => shift.staffId === staffId && shift.status !== "cancelled")
      .reduce((total, shift) => total + shiftDurationHours(shift.startTime, shift.endTime), 0)
  }, [getShiftsForWeek])

  const getClientHoursForWeek = useCallback((weekStart: Date, clientId: string) => {
    return getShiftsForWeek(weekStart)
      .filter((shift) => shift.clientId === clientId && shift.status !== "cancelled")
      .reduce((total, shift) => total + shiftDurationHours(shift.startTime, shift.endTime), 0)
  }, [getShiftsForWeek])

  const activeStaff = useMemo(
    () => staff.filter((member) => member.status === "active" || member.status === "invited"),
    [staff]
  )

  const activeClients = useMemo(
    () => clients.filter((client) => client.status === "active"),
    [clients]
  )

  const visibleShifts = useMemo(() => {
    if (canManageWorkspaceSettings) return shifts
    return shifts.map((shift) => ({ ...shift, adminNotes: "" }))
  }, [canManageWorkspaceSettings, shifts])

  return (
    <RosterContext.Provider
      value={{
        shifts: visibleShifts,
        isLoading,
        fetchError,
        activeStaff,
        activeClients,
        getShiftsForWeek,
        getStaffHoursForWeek,
        getClientHoursForWeek,
        addShift,
        updateShift,
        deleteShift,
        duplicateShift,
        copyWeek,
        refetch: fetchShifts,
      }}
    >
      {children}
    </RosterContext.Provider>
  )
}

export function useRosterContext() {
  const ctx = useContext(RosterContext)
  if (!ctx) throw new Error("useRosterContext must be used within RosterProvider")
  return ctx
}
