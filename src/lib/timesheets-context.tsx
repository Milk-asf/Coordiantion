"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { useStaff } from "@/lib/staff-context"
import { captureClockLocation } from "@/lib/geolocation"
import {
  computeWorkedMinutes,
  normalizeTravelClaim,
  travelClaimEntryKey,
  type ClockEvent,
  type ClockEventType,
  type Timesheet,
  type TimesheetInput,
  type TimesheetStatus,
  type TravelClaim,
  type TravelClaimEntry,
  type TravelClaimStatus,
} from "@/lib/timesheets/types"

interface ClockEventRow {
  id: string
  workspace_id: string
  staff_id: string | null
  submitted_by_name: string
  timesheet_id: string | null
  event_type: ClockEventType
  recorded_at: string
  latitude: number | null
  longitude: number | null
  location_label: string
  created_at: string
}

function clockEventsKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-clock-events-${workspaceId}` : "workspace-clock-events"
}

function dbToClockEvent(row: ClockEventRow): ClockEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    staffId: row.staff_id,
    submittedByName: row.submitted_by_name || "",
    timesheetId: row.timesheet_id,
    eventType: row.event_type,
    recordedAt: row.recorded_at,
    latitude: row.latitude,
    longitude: row.longitude,
    locationLabel: row.location_label || "",
    createdAt: row.created_at,
  }
}

function clockEventToRow(event: ClockEvent) {
  return {
    id: event.id,
    workspace_id: event.workspaceId,
    staff_id: event.staffId,
    submitted_by_name: event.submittedByName,
    timesheet_id: event.timesheetId,
    event_type: event.eventType,
    recorded_at: event.recordedAt,
    latitude: event.latitude,
    longitude: event.longitude,
    location_label: event.locationLabel,
    created_at: event.createdAt,
  }
}

function loadLocalClockEvents(workspaceId: string | undefined): ClockEvent[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(clockEventsKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ClockEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalClockEvents(workspaceId: string | undefined, events: ClockEvent[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(clockEventsKey(workspaceId), JSON.stringify(events))
}

interface TimesheetRow {
  id: string
  workspace_id: string
  staff_id: string | null
  submitted_by_name: string
  shift_id: string | null
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  break_minutes: number | null
  worked_minutes: number | null
  notes: string | null
  signature: string | null
  travel_claims: TravelClaim[] | null
  status: TimesheetStatus
  review_note: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  invoiced_at: string | null
  invoice_id: string | null
  clock_active: boolean | null
  clocked_in_at: string | null
  created_at: string
  updated_at: string
}

function timesheetsKey(workspaceId: string | undefined) {
  return workspaceId ? `workspace-timesheets-${workspaceId}` : "workspace-timesheets"
}

function normalizeTime(value: string): string {
  // Postgres returns "HH:MM:SS"; the UI works with "HH:MM".
  return value ? value.slice(0, 5) : value
}

function dbToTimesheet(row: TimesheetRow): Timesheet {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    staffId: row.staff_id,
    submittedByName: row.submitted_by_name || "",
    shiftId: row.shift_id,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    breakMinutes: row.break_minutes ?? 0,
    workedMinutes: row.worked_minutes ?? 0,
    notes: row.notes || "",
    signature: row.signature || "",
    travelClaims: Array.isArray(row.travel_claims) ? row.travel_claims.map(normalizeTravelClaim) : [],
    status: row.status || "draft",
    reviewNote: row.review_note || "",
    reviewedByName: row.reviewed_by_name || "",
    reviewedAt: row.reviewed_at,
    invoicedAt: row.invoiced_at,
    invoiceId: row.invoice_id,
    clockActive: row.clock_active ?? false,
    clockedInAt: row.clocked_in_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function timesheetToRow(timesheet: Timesheet) {
  return {
    workspace_id: timesheet.workspaceId,
    staff_id: timesheet.staffId,
    submitted_by_name: timesheet.submittedByName,
    shift_id: timesheet.shiftId,
    start_date: timesheet.startDate,
    end_date: timesheet.endDate,
    start_time: timesheet.startTime,
    end_time: timesheet.endTime,
    break_minutes: timesheet.breakMinutes,
    worked_minutes: timesheet.workedMinutes,
    notes: timesheet.notes,
    signature: timesheet.signature,
    travel_claims: timesheet.travelClaims,
    status: timesheet.status,
    review_note: timesheet.reviewNote,
    reviewed_by_name: timesheet.reviewedByName,
    reviewed_at: timesheet.reviewedAt,
    invoiced_at: timesheet.invoicedAt,
    invoice_id: timesheet.invoiceId,
    clock_active: timesheet.clockActive,
    clocked_in_at: timesheet.clockedInAt,
    created_at: timesheet.createdAt,
    updated_at: timesheet.updatedAt,
  }
}

function loadLocalTimesheets(workspaceId: string | undefined): Timesheet[] {
  if (typeof window === "undefined" || !workspaceId) return []
  try {
    const raw = localStorage.getItem(timesheetsKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Timesheet[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalTimesheets(workspaceId: string | undefined, timesheets: Timesheet[]) {
  if (typeof window === "undefined" || !workspaceId) return
  localStorage.setItem(timesheetsKey(workspaceId), JSON.stringify(timesheets))
}

interface TimesheetsContextValue {
  timesheets: Timesheet[]
  clockEvents: ClockEvent[]
  myTimesheets: Timesheet[]
  reviewTimesheets: Timesheet[]
  billableTimesheets: Timesheet[]
  reviewTravelClaims: TravelClaimEntry[]
  activeClock: Timesheet | null
  currentStaffId: string | null
  isLoading: boolean
  fetchError: string | null
  getTimesheet: (id: string) => Timesheet | undefined
  addTimesheet: (input: TimesheetInput) => Promise<Timesheet | null>
  updateTimesheet: (id: string, updates: TimesheetInput) => Promise<void>
  deleteTimesheet: (id: string) => Promise<void>
  setStatus: (id: string, status: TimesheetStatus, reviewNote?: string) => Promise<void>
  setTravelClaimStatus: (timesheetId: string, claimId: string, status: TravelClaimStatus, reviewNote?: string) => Promise<void>
  markInvoiced: (id: string, invoiceId: string) => Promise<void>
  clockOn: () => Promise<Timesheet | null>
  clockOff: (id: string) => Promise<Timesheet | null>
  refetch: () => Promise<void>
}

const TimesheetsContext = createContext<TimesheetsContextValue | null>(null)

export function TimesheetsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace, currentUserName } = useWorkspace()
  const { staff } = useStaff()
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Best-effort match of the signed-in user to their staff record.
  const currentStaffId = useMemo(() => {
    const name = currentUserName.trim().toLowerCase()
    if (!name) return null
    const match = staff.find((member) => member.name.trim().toLowerCase() === name)
    return match?.id ?? null
  }, [currentUserName, staff])

  const persistTimesheets = useCallback(
    (updater: Timesheet[] | ((prev: Timesheet[]) => Timesheet[])) => {
      setTimesheets((prev) => {
        const next = typeof updater === "function" ? (updater as (p: Timesheet[]) => Timesheet[])(prev) : updater
        saveLocalTimesheets(activeWorkspace?.id, next)
        return next
      })
    },
    [activeWorkspace?.id],
  )

  const persistClockEvents = useCallback(
    (updater: ClockEvent[] | ((prev: ClockEvent[]) => ClockEvent[])) => {
      setClockEvents((prev) => {
        const next = typeof updater === "function" ? (updater as (p: ClockEvent[]) => ClockEvent[])(prev) : updater
        saveLocalClockEvents(activeWorkspace?.id, next)
        return next
      })
    },
    [activeWorkspace?.id],
  )

  const fetchTimesheets = useCallback(async () => {
    if (!activeWorkspace) {
      setTimesheets([])
      setClockEvents([])
      setIsLoading(false)
      return
    }

    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) {
      setTimesheets(loadLocalTimesheets(activeWorkspace.id))
      setClockEvents(loadLocalClockEvents(activeWorkspace.id))
      setFetchError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)

    try {
      const [timesheetsResult, clockEventsResult] = await Promise.all([
        supabase
          .from("timesheets")
          .select("*")
          .eq("workspace_id", activeWorkspace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("clock_events")
          .select("*")
          .eq("workspace_id", activeWorkspace.id)
          .order("recorded_at", { ascending: false }),
      ])

      if (timesheetsResult.error || !timesheetsResult.data) {
        setFetchError(timesheetsResult.error?.message || "Failed to load timesheets")
        setTimesheets(loadLocalTimesheets(activeWorkspace.id))
      } else {
        persistTimesheets((timesheetsResult.data as TimesheetRow[]).map(dbToTimesheet))
      }

      if (clockEventsResult.error || !clockEventsResult.data) {
        setClockEvents(loadLocalClockEvents(activeWorkspace.id))
      } else {
        persistClockEvents((clockEventsResult.data as ClockEventRow[]).map(dbToClockEvent))
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load timesheets")
      setTimesheets(loadLocalTimesheets(activeWorkspace.id))
      setClockEvents(loadLocalClockEvents(activeWorkspace.id))
    }

    setIsLoading(false)
  }, [activeWorkspace, persistTimesheets, persistClockEvents])

  useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])

  const buildTimesheet = useCallback(
    (input: TimesheetInput): Timesheet => {
      const now = new Date().toISOString()
      const breakMinutes = Math.max(0, input.breakMinutes ?? 0)
      const workedMinutes =
        input.workedMinutes ?? computeWorkedMinutes(input.startTime, input.endTime, breakMinutes)
      return {
        id: crypto.randomUUID(),
        workspaceId: activeWorkspace?.id ?? "",
        staffId: input.staffId ?? currentStaffId,
        submittedByName: currentUserName,
        shiftId: input.shiftId ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes,
        workedMinutes,
        notes: input.notes ?? "",
        signature: input.signature ?? "",
        travelClaims: input.travelClaims ?? [],
        status: input.status ?? "draft",
        reviewNote: "",
        reviewedByName: "",
        reviewedAt: null,
        invoicedAt: null,
        invoiceId: null,
        clockActive: input.clockActive ?? false,
        clockedInAt: input.clockedInAt ?? null,
        createdAt: now,
        updatedAt: now,
      }
    },
    [activeWorkspace?.id, currentStaffId, currentUserName],
  )

  const addTimesheet = useCallback(
    async (input: TimesheetInput): Promise<Timesheet | null> => {
      if (!activeWorkspace) return null
      const timesheet = buildTimesheet(input)

      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) {
        persistTimesheets((prev) => [timesheet, ...prev])
        return timesheet
      }

      const { data, error } = await supabase
        .from("timesheets")
        .insert(timesheetToRow(timesheet))
        .select("*")
        .single()

      const saved = error || !data ? timesheet : dbToTimesheet(data as TimesheetRow)
      persistTimesheets((prev) => [saved, ...prev])
      return saved
    },
    [activeWorkspace, buildTimesheet, persistTimesheets],
  )

  const persistUpdate = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const supabase = isSupabaseConfigured() ? createClient() : null
    if (!supabase) return
    await supabase.from("timesheets").update(patch).eq("id", id)
  }, [])

  const updateTimesheet = useCallback(
    async (id: string, updates: TimesheetInput) => {
      if (!activeWorkspace) return
      const updatedAt = new Date().toISOString()
      let nextTimesheet: Timesheet | null = null

      persistTimesheets((prev) =>
        prev.map((timesheet) => {
          if (timesheet.id !== id) return timesheet
          const breakMinutes = Math.max(0, updates.breakMinutes ?? timesheet.breakMinutes)
          const startTime = updates.startTime ?? timesheet.startTime
          const endTime = updates.endTime ?? timesheet.endTime
          const workedMinutes =
            updates.workedMinutes ?? computeWorkedMinutes(startTime, endTime, breakMinutes)
          nextTimesheet = {
            ...timesheet,
            ...(updates.staffId !== undefined ? { staffId: updates.staffId } : {}),
            ...(updates.shiftId !== undefined ? { shiftId: updates.shiftId } : {}),
            ...(updates.startDate !== undefined ? { startDate: updates.startDate } : {}),
            ...(updates.endDate !== undefined ? { endDate: updates.endDate } : {}),
            startTime,
            endTime,
            breakMinutes,
            workedMinutes,
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
            ...(updates.signature !== undefined ? { signature: updates.signature } : {}),
            ...(updates.travelClaims !== undefined ? { travelClaims: updates.travelClaims } : {}),
            ...(updates.status !== undefined ? { status: updates.status } : {}),
            updatedAt,
          }
          return nextTimesheet
        }),
      )

      if (nextTimesheet) await persistUpdate(id, timesheetToRow(nextTimesheet))
    },
    [activeWorkspace, persistTimesheets, persistUpdate],
  )

  const deleteTimesheet = useCallback(
    async (id: string) => {
      if (!activeWorkspace) return
      persistTimesheets((prev) => prev.filter((timesheet) => timesheet.id !== id))
      const supabase = isSupabaseConfigured() ? createClient() : null
      if (supabase) await supabase.from("timesheets").delete().eq("id", id)
    },
    [activeWorkspace, persistTimesheets],
  )

  const setStatus = useCallback(
    async (id: string, status: TimesheetStatus, reviewNote?: string) => {
      if (!activeWorkspace) return
      const updatedAt = new Date().toISOString()
      // Returning/approving is a review action; submitting/drafting is the worker's own.
      const isReview = status === "approved" || status === "returned"
      const reviewedByName = isReview ? currentUserName : ""
      const reviewedAt = isReview ? updatedAt : null
      const nextReviewNote = status === "returned" ? reviewNote ?? "" : ""

      persistTimesheets((prev) =>
        prev.map((timesheet) =>
          timesheet.id === id
            ? { ...timesheet, status, reviewNote: nextReviewNote, reviewedByName, reviewedAt, updatedAt }
            : timesheet,
        ),
      )

      await persistUpdate(id, {
        status,
        review_note: nextReviewNote,
        reviewed_by_name: reviewedByName,
        reviewed_at: reviewedAt,
        updated_at: updatedAt,
      })
    },
    [activeWorkspace, currentUserName, persistTimesheets, persistUpdate],
  )

  const logClockEvent = useCallback(
    async (input: {
      eventType: ClockEventType
      timesheetId: string | null
      recordedAt: string
      latitude: number | null
      longitude: number | null
      locationLabel: string
    }): Promise<void> => {
      if (!activeWorkspace) return

      const event: ClockEvent = {
        id: crypto.randomUUID(),
        workspaceId: activeWorkspace.id,
        staffId: currentStaffId,
        submittedByName: currentUserName,
        timesheetId: input.timesheetId,
        eventType: input.eventType,
        recordedAt: input.recordedAt,
        latitude: input.latitude,
        longitude: input.longitude,
        locationLabel: input.locationLabel,
        createdAt: input.recordedAt,
      }

      const supabase = isSupabaseConfigured() ? createClient() : null
      if (!supabase) {
        persistClockEvents((prev) => [event, ...prev])
        return
      }

      const { data, error } = await supabase
        .from("clock_events")
        .insert(clockEventToRow(event))
        .select("*")
        .single()

      const saved = error || !data ? event : dbToClockEvent(data as ClockEventRow)
      persistClockEvents((prev) => [saved, ...prev])
    },
    [activeWorkspace, currentStaffId, currentUserName, persistClockEvents],
  )

  // Open a new clock session: a draft timesheet stamped with the clock-on time.
  const clockOn = useCallback(async (): Promise<Timesheet | null> => {
    if (!activeWorkspace) return null
    const now = new Date()
    const date = now.toISOString().slice(0, 10)
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    const location = await captureClockLocation()
    const created = await addTimesheet({
      startDate: date,
      endDate: date,
      startTime: time,
      endTime: time,
      breakMinutes: 0,
      workedMinutes: 0,
      status: "draft",
      clockActive: true,
      clockedInAt: now.toISOString(),
    })
    if (created) {
      await logClockEvent({
        eventType: "clock_on",
        timesheetId: created.id,
        recordedAt: now.toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        locationLabel: location.locationLabel,
      })
    }
    return created
  }, [activeWorkspace, addTimesheet, logClockEvent])

  // Close the active clock session: stamp the end time and compute worked time.
  const clockOff = useCallback(
    async (id: string): Promise<Timesheet | null> => {
      if (!activeWorkspace) return null
      const now = new Date()
      const endDate = now.toISOString().slice(0, 10)
      const endTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const location = await captureClockLocation()
      let nextTimesheet: Timesheet | null = null

      persistTimesheets((prev) =>
        prev.map((timesheet) => {
          if (timesheet.id !== id) return timesheet
          const workedMinutes = computeWorkedMinutes(timesheet.startTime, endTime, timesheet.breakMinutes)
          nextTimesheet = {
            ...timesheet,
            endDate,
            endTime,
            workedMinutes,
            clockActive: false,
            updatedAt: now.toISOString(),
          }
          return nextTimesheet
        }),
      )

      if (nextTimesheet) {
        await persistUpdate(id, {
          end_date: endDate,
          end_time: endTime,
          worked_minutes: (nextTimesheet as Timesheet).workedMinutes,
          clock_active: false,
          updated_at: now.toISOString(),
        })
        await logClockEvent({
          eventType: "clock_off",
          timesheetId: id,
          recordedAt: now.toISOString(),
          latitude: location.latitude,
          longitude: location.longitude,
          locationLabel: location.locationLabel,
        })
      }
      return nextTimesheet
    },
    [activeWorkspace, persistTimesheets, persistUpdate, logClockEvent],
  )

  const markInvoiced = useCallback(
    async (id: string, invoiceId: string) => {
      if (!activeWorkspace) return
      const invoicedAt = new Date().toISOString()
      persistTimesheets((prev) =>
        prev.map((timesheet) =>
          timesheet.id === id ? { ...timesheet, invoicedAt, invoiceId, updatedAt: invoicedAt } : timesheet,
        ),
      )
      await persistUpdate(id, { invoiced_at: invoicedAt, invoice_id: invoiceId, updated_at: invoicedAt })
    },
    [activeWorkspace, persistTimesheets, persistUpdate],
  )

  const setTravelClaimStatus = useCallback(
    async (timesheetId: string, claimId: string, status: TravelClaimStatus, reviewNote?: string) => {
      if (!activeWorkspace) return
      const updatedAt = new Date().toISOString()
      let nextClaims: TravelClaim[] | null = null

      persistTimesheets((prev) =>
        prev.map((timesheet) => {
          if (timesheet.id !== timesheetId) return timesheet
          nextClaims = timesheet.travelClaims.map((claim) =>
            claim.id === claimId
              ? { ...claim, status, reviewNote: status === "returned" ? reviewNote ?? "" : "" }
              : claim,
          )
          return { ...timesheet, travelClaims: nextClaims, updatedAt }
        }),
      )

      if (nextClaims) await persistUpdate(timesheetId, { travel_claims: nextClaims, updated_at: updatedAt })
    },
    [activeWorkspace, persistTimesheets, persistUpdate],
  )

  const getTimesheet = useCallback((id: string) => timesheets.find((t) => t.id === id), [timesheets])

  const myTimesheets = useMemo(
    () =>
      timesheets.filter(
        (timesheet) =>
          (currentStaffId && timesheet.staffId === currentStaffId) ||
          timesheet.submittedByName.trim().toLowerCase() === currentUserName.trim().toLowerCase(),
      ),
    [timesheets, currentStaffId, currentUserName],
  )

  const reviewTimesheets = useMemo(
    () => timesheets.filter((timesheet) => timesheet.status !== "draft"),
    [timesheets],
  )

  // Approved timesheets that have not yet been rolled into an invoice form the
  // billing queue in the invoicing area.
  const billableTimesheets = useMemo(
    () => timesheets.filter((timesheet) => timesheet.status === "approved" && !timesheet.invoicedAt),
    [timesheets],
  )

  // The current worker's open clock session, if any (only one at a time).
  const activeClock = useMemo(
    () => myTimesheets.find((timesheet) => timesheet.clockActive) ?? null,
    [myTimesheets],
  )

  // Travel claims from submitted timesheets, flattened for the finance review.
  const reviewTravelClaims = useMemo<TravelClaimEntry[]>(() => {
    const entries: TravelClaimEntry[] = []
    for (const timesheet of timesheets) {
      if (timesheet.status === "draft" || timesheet.clockActive) continue
      for (const claim of timesheet.travelClaims) {
        entries.push({
          key: travelClaimEntryKey(timesheet.id, claim.id),
          timesheetId: timesheet.id,
          claim,
          submittedByName: timesheet.submittedByName,
          staffId: timesheet.staffId,
          date: timesheet.startDate,
        })
      }
    }
    return entries
  }, [timesheets])

  return (
    <TimesheetsContext.Provider
      value={{
        timesheets,
        clockEvents,
        myTimesheets,
        reviewTimesheets,
        billableTimesheets,
        reviewTravelClaims,
        activeClock,
        currentStaffId,
        isLoading,
        fetchError,
        getTimesheet,
        addTimesheet,
        updateTimesheet,
        deleteTimesheet,
        setStatus,
        setTravelClaimStatus,
        markInvoiced,
        clockOn,
        clockOff,
        refetch: fetchTimesheets,
      }}
    >
      {children}
    </TimesheetsContext.Provider>
  )
}

export function useTimesheets() {
  const ctx = useContext(TimesheetsContext)
  if (!ctx) throw new Error("useTimesheets must be used within TimesheetsProvider")
  return ctx
}
