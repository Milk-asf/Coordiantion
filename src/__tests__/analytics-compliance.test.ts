import { describe, expect, it } from "vitest"
import {
  getDocumentExpiryStatus,
  getIncidentCaseState,
  getScreeningStatus,
  getShiftNoteStatus,
  getTimesheetRosterMatch,
} from "@/lib/analytics/record-status"
import { isDateInRange, resolveDateWindow } from "@/lib/analytics/scope"
import { collectFilterValues, computeWidget, scopeWidgetRecords } from "@/lib/analytics/compute"
import {
  SPACE_TEMPLATES,
  createWidget,
  getDataSource,
  getDimension,
  getMeasure,
  resolveEntityRecords,
  type TimesheetAnalyticsRecord,
} from "@/lib/analytics/definitions"

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return iso(date)
}

const NOW = new Date("2026-07-05T12:00:00")

describe("record status helpers", () => {
  it("buckets worker screening health", () => {
    expect(getScreeningStatus("", NOW)).toBe("missing")
    expect(getScreeningStatus(null, NOW)).toBe("missing")
    expect(getScreeningStatus("not-a-date", NOW)).toBe("missing")
    expect(getScreeningStatus("2026-07-04", NOW)).toBe("expired")
    expect(getScreeningStatus("2026-07-05", NOW)).toBe("expiring")
    expect(getScreeningStatus("2026-08-20", NOW)).toBe("expiring")
    // 60 days out is the first "valid" day.
    expect(getScreeningStatus("2026-09-03", NOW)).toBe("valid")
    expect(getScreeningStatus("2027-07-05", NOW)).toBe("valid")
  })

  it("tracks progress note timeliness", () => {
    const base = { date: "2026-07-05", startTime: "09:00", endTime: "11:00", status: "completed" as const, progressNote: null }
    const note = { supportProvided: "Support provided" } as never

    expect(getShiftNoteStatus({ ...base, progressNote: note }, NOW)).toBe("recorded")
    expect(getShiftNoteStatus({ ...base, status: "cancelled" }, NOW)).toBe("not-required")
    // Ends later today — not due yet.
    expect(getShiftNoteStatus({ ...base, startTime: "13:00", endTime: "15:00" }, NOW)).toBe("not-due")
    // Ended an hour ago — inside the 24h grace window.
    expect(getShiftNoteStatus(base, NOW)).toBe("due")
    // Ended over 24h ago — overdue.
    expect(getShiftNoteStatus({ ...base, date: "2026-07-03" }, NOW)).toBe("overdue")
    // Overnight shift that started yesterday evening ends this morning.
    expect(getShiftNoteStatus({ ...base, date: "2026-07-04", startTime: "22:00", endTime: "06:00" }, NOW)).toBe("due")
  })

  it("buckets document expiry", () => {
    expect(getDocumentExpiryStatus(null, NOW)).toBe("none")
    expect(getDocumentExpiryStatus("2026-07-01", NOW)).toBe("expired")
    expect(getDocumentExpiryStatus("2026-07-20", NOW)).toBe("expiring")
    expect(getDocumentExpiryStatus("2026-08-03", NOW)).toBe("expiring")
    // 30 days out is the first "valid" day.
    expect(getDocumentExpiryStatus("2026-08-04", NOW)).toBe("valid")
  })

  it("compares timesheets against the rostered shift", () => {
    const timesheet = { startDate: "2026-07-01", workedMinutes: 110, breakMinutes: 10 }
    const shift = { date: "2026-07-01", startTime: "09:00", endTime: "11:00" }

    expect(getTimesheetRosterMatch(timesheet, null)).toBe("unlinked")
    // 120 paid vs 120 rostered.
    expect(getTimesheetRosterMatch(timesheet, shift)).toBe("match")
    // 15-minute tolerance is inclusive.
    expect(getTimesheetRosterMatch({ ...timesheet, workedMinutes: 95 }, shift)).toBe("match")
    expect(getTimesheetRosterMatch({ ...timesheet, workedMinutes: 94 }, shift)).toBe("mismatch")
    // Different day entirely.
    expect(getTimesheetRosterMatch({ ...timesheet, startDate: "2026-07-02" }, shift)).toBe("mismatch")
    // Overnight roster span (22:00 → 06:00 = 8h).
    expect(
      getTimesheetRosterMatch(
        { startDate: "2026-07-01", workedMinutes: 480, breakMinutes: 0 },
        { date: "2026-07-01", startTime: "22:00", endTime: "06:00" },
      ),
    ).toBe("match")
  })

  it("derives incident case state from the investigation", () => {
    expect(getIncidentCaseState("sent")).toBe("open")
    expect(getIncidentCaseState("in_progress")).toBe("open")
    expect(getIncidentCaseState("completed")).toBe("closed")
    expect(getIncidentCaseState("closed")).toBe("closed")
    expect(getIncidentCaseState("not_an_incident")).toBe("dismissed")
  })
})

describe("date windows", () => {
  it("resolves relative windows against a fixed clock", () => {
    expect(resolveDateWindow("all", NOW)).toBeNull()
    expect(resolveDateWindow(undefined, NOW)).toBeNull()

    const last7 = resolveDateWindow("last7", NOW)!
    expect(iso(last7.start)).toBe("2026-06-29")
    expect(iso(last7.end)).toBe("2026-07-06")

    const thisMonth = resolveDateWindow("thisMonth", NOW)!
    expect(iso(thisMonth.start)).toBe("2026-07-01")
    expect(iso(thisMonth.end)).toBe("2026-08-01")

    const lastMonth = resolveDateWindow("lastMonth", NOW)!
    expect(iso(lastMonth.start)).toBe("2026-06-01")
    expect(iso(lastMonth.end)).toBe("2026-07-01")

    const quarter = resolveDateWindow("thisQuarter", NOW)!
    expect(iso(quarter.start)).toBe("2026-07-01")
    expect(iso(quarter.end)).toBe("2026-10-01")

    // 2026-07-05 is a Sunday; the Monday-start week began 29 June.
    const week = resolveDateWindow("thisWeek", NOW)!
    expect(iso(week.start)).toBe("2026-06-29")
    expect(iso(week.end)).toBe("2026-07-06")
  })

  it("checks membership with day and datetime values", () => {
    const range = resolveDateWindow("last7", NOW)!
    expect(isDateInRange("2026-07-05", range)).toBe(true)
    expect(isDateInRange("2026-06-29", range)).toBe(true)
    expect(isDateInRange("2026-06-28", range)).toBe(false)
    expect(isDateInRange("2026-07-05T09:30:00.000Z", range)).toBe(true)
    expect(isDateInRange(null, range)).toBe(false)
    expect(isDateInRange("garbage", range)).toBe(false)
  })
})

function makeShift(overrides: Record<string, unknown>) {
  return {
    id: "shift-1",
    staffId: "staff-1",
    staffName: "Amy Worker",
    clientId: "client-1",
    clientName: "Ben Participant",
    date: daysFromNow(0),
    startTime: "09:00",
    endTime: "11:00",
    sessionType: "community",
    location: "Home",
    status: "completed",
    progressNote: null,
    ...overrides,
  }
}

describe("widget scoping", () => {
  const shifts = [
    makeShift({ id: "a", status: "completed", date: daysFromNow(-2) }),
    makeShift({ id: "b", status: "completed", date: daysFromNow(-40) }),
    makeShift({ id: "c", status: "cancelled", date: daysFromNow(-1) }),
    makeShift({ id: "d", status: "scheduled", date: daysFromNow(3), staffName: "Cal Worker" }),
  ]

  it("applies date windows and field filters", () => {
    const source = getDataSource("shifts")

    const windowed = scopeWidgetRecords(createWidget({ source: "shifts", dateWindow: "last30" }), source, shifts)
    expect(windowed.map((record) => (record as { id: string }).id)).toEqual(["a", "c"])

    const filtered = scopeWidgetRecords(
      createWidget({
        source: "shifts",
        filters: [{ id: "f1", dimension: "status", values: ["completed"] }],
      }),
      source,
      shifts,
    )
    expect(filtered).toHaveLength(2)

    const both = scopeWidgetRecords(
      createWidget({
        source: "shifts",
        dateWindow: "last30",
        filters: [{ id: "f1", dimension: "status", values: ["completed"] }],
      }),
      source,
      shifts,
    )
    expect(both.map((record) => (record as { id: string }).id)).toEqual(["a"])
  })

  it("feeds scoped records through computeWidget for metrics and lists", () => {
    const metric = computeWidget(
      createWidget({
        source: "shifts",
        visualization: "metric",
        dateWindow: "last30",
        filters: [{ id: "f1", dimension: "status", values: ["completed"] }],
      }),
      shifts,
    )
    expect(metric.total).toBe(1)
    expect(metric.records).toHaveLength(1)

    const list = computeWidget(
      createWidget({ source: "shifts", visualization: "list", filters: [{ id: "f1", dimension: "staffName", values: ["Cal Worker"] }] }),
      shifts,
    )
    expect(list.records).toHaveLength(1)
    expect((list.records[0] as { id: string }).id).toBe("d")
  })

  it("collects distinct filter values with counts", () => {
    const source = getDataSource("shifts")
    const statusDim = getDimension(source, "status")!
    const values = collectFilterValues(statusDim, shifts)
    expect(values).toEqual([
      { key: "cancelled", label: "cancelled", count: 1 },
      { key: "completed", label: "completed", count: 2 },
      { key: "scheduled", label: "scheduled", count: 1 },
    ])
  })
})

describe("cross-source joins", () => {
  it("joins timesheets to their rostered shift", () => {
    const shift = makeShift({ id: "shift-9", startTime: "09:00", endTime: "17:00" })
    const timesheets = [
      { id: "ts-1", shiftId: "shift-9", startDate: shift.date, workedMinutes: 450, breakMinutes: 30, status: "sent", submittedByName: "Amy", travelClaims: [] },
      { id: "ts-2", shiftId: null, startDate: daysFromNow(0), workedMinutes: 120, breakMinutes: 0, status: "draft", submittedByName: "Cal", travelClaims: [] },
    ]

    const records = resolveEntityRecords("timesheets", { timesheets, shifts: [shift] }) as TimesheetAnalyticsRecord[]
    expect(records[0].shift?.id).toBe("shift-9")
    expect(records[1].shift).toBeNull()

    const source = getDataSource("timesheets")
    const matchDim = getDimension(source, "rosterMatch")!
    expect(matchDim.get(records[0])).toBe("Matches roster")
    expect(matchDim.get(records[1])).toBe("No linked shift")
  })
})

describe("space templates", () => {
  it("reference only real sources, dimensions, measures and filters", () => {
    for (const template of SPACE_TEMPLATES) {
      for (const seed of template.widgets) {
        const source = getDataSource(seed.source ?? "shifts")
        expect(source.key).toBe(seed.source ?? "shifts")

        if (seed.groupBy) {
          expect(getDimension(source, seed.groupBy), `${template.id}: ${seed.title} groupBy`).not.toBeNull()
        }
        if (seed.measureField) {
          expect(getMeasure(source, seed.measureField), `${template.id}: ${seed.title} measure`).not.toBeNull()
        }
        for (const filter of seed.filters ?? []) {
          const dimension = getDimension(source, filter.dimension)
          expect(dimension, `${template.id}: ${seed.title} filter ${filter.dimension}`).not.toBeNull()
          expect(dimension!.kind).not.toBe("date")
          expect(filter.values.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it("keeps the compliance template's filter values reachable by their dimensions", () => {
    // Guards against renaming a status label and silently breaking the template.
    const complianceChecks: { source: string; dimension: string; record: unknown; expected: string }[] = [
      {
        source: "staff",
        dimension: "screeningStatus",
        record: { name: "A", status: "active", details: { ndisScreeningExpiry: "2020-01-01" } },
        expected: "Expired",
      },
      {
        source: "shifts",
        dimension: "noteStatus",
        record: makeShift({ date: daysFromNow(-5), progressNote: null }),
        expected: "Note overdue",
      },
      {
        source: "incidents",
        dimension: "caseState",
        record: { investigationStatus: "sent" },
        expected: "Open",
      },
    ]

    for (const check of complianceChecks) {
      const dimension = getDimension(getDataSource(check.source), check.dimension)!
      expect(dimension.get(check.record)).toBe(check.expected)
    }
  })
})
