import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { computeWidget } from "@/lib/analytics/compute"
import {
  asTimesheetRecord,
  createWidget,
  getDataSource,
  getDimension,
  getListMeta,
  resolveEntityRecords,
} from "@/lib/analytics/definitions"
import { getListSource, getRecordId, resolveListRecords } from "@/lib/lists/definitions"
import { WidgetChart } from "@/app/(dashboard)/reports/_components/widget-chart"
import { WidgetConfigPanel } from "@/app/(dashboard)/reports/_components/widget-config-panel"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}))

beforeEach(() => {
  push.mockClear()
})

function makeShift(overrides: Record<string, unknown>) {
  return {
    id: "shift-1",
    staffId: "staff-1",
    staffName: "Amy Worker",
    clientId: "client-1",
    clientName: "Ben Participant",
    date: "2026-07-01",
    startTime: "09:00",
    endTime: "11:00",
    sessionType: "community",
    location: "Home",
    status: "completed",
    progressNote: null,
    ...overrides,
  }
}

const rawTimesheet = {
  id: "ts-1",
  workspaceId: "ws-1",
  staffId: "staff-1",
  submittedByName: "Amy Worker",
  shiftId: "shift-1",
  startDate: "2026-07-01",
  endDate: "2026-07-01",
  startTime: "09:00",
  endTime: "11:00",
  breakMinutes: 0,
  workedMinutes: 120,
  notes: "",
  signature: "",
  travelClaims: [],
  status: "sent",
  reviewNote: "",
  reviewedByName: "",
  reviewedAt: null,
  invoicedAt: null,
  invoiceId: null,
  clockActive: false,
  clockedInAt: null,
  createdAt: "2026-07-01T11:00:00.000Z",
  updatedAt: "2026-07-01T11:00:00.000Z",
}

describe("timesheet record shape tolerance", () => {
  it("analytics timesheet fields accept raw and joined records without crashing", () => {
    const source = getDataSource("timesheets")
    const statusDim = getDimension(source, "status")!
    const matchDim = getDimension(source, "rosterMatch")!

    // Raw timesheet (the shape Lists used to feed) — must not throw.
    expect(statusDim.get(rawTimesheet)).toBe("sent")
    expect(matchDim.get(rawTimesheet)).toBe("No linked shift")

    // Joined record from the entity resolver.
    const joined = resolveEntityRecords("timesheets", {
      timesheets: [rawTimesheet],
      shifts: [makeShift({})],
    })
    expect(statusDim.get(joined[0])).toBe("sent")
    expect(matchDim.get(joined[0])).toBe("Matches roster")
  })

  it("joined records keep the timesheet id so saved list membership still resolves", () => {
    const joined = resolveEntityRecords("timesheets", {
      timesheets: [rawTimesheet],
      shifts: [],
    })
    expect(getRecordId(joined[0], 0)).toBe("ts-1")
    expect(resolveListRecords(joined, ["ts-1"])).toHaveLength(1)
    expect(asTimesheetRecord(joined[0]).timesheet.submittedByName).toBe("Amy Worker")
  })

  it("the lists timesheet source renders its primary label for both shapes", () => {
    const source = getListSource("timesheets")!
    expect(source.primary.get(rawTimesheet)).toBe("Amy Worker")
    const joined = resolveEntityRecords("timesheets", { timesheets: [rawTimesheet], shifts: [] })
    expect(source.primary.get(joined[0])).toBe("Amy Worker")
  })
})

describe("record list visualisation", () => {
  const shifts = [
    makeShift({ id: "a", date: "2026-07-03", staffName: "Amy Worker" }),
    makeShift({ id: "b", date: "2026-07-02", staffName: "Cal Worker" }),
    makeShift({ id: "c", date: "2026-07-01", staffName: "Dee Worker" }),
  ]

  function renderList(interactive: boolean, limit = 2) {
    const widget = createWidget({ source: "shifts", visualization: "list", limit })
    const computation = computeWidget(widget, shifts)
    return render(<WidgetChart widget={widget} computation={computation} interactive={interactive} />)
  }

  it("renders curated columns, recent-first rows and a truncation footer", () => {
    renderList(true)
    expect(screen.getByText("Support worker")).toBeInTheDocument()
    expect(screen.getByText("Progress note")).toBeInTheDocument()
    expect(screen.getByText("Amy Worker")).toBeInTheDocument()
    expect(screen.getByText("Cal Worker")).toBeInTheDocument()
    // Third (oldest) row trimmed by the limit.
    expect(screen.queryByText("Dee Worker")).not.toBeInTheDocument()
    expect(screen.getByText("Showing 2 of 3 shifts")).toBeInTheDocument()
  })

  it("navigates to the record on row click when interactive", () => {
    renderList(true)
    fireEvent.click(screen.getByText("Amy Worker"))
    expect(push).toHaveBeenCalledWith("/roster?date=2026-07-03")
  })

  it("does not navigate in builder previews", () => {
    renderList(false)
    fireEvent.click(screen.getByText("Amy Worker"))
    expect(push).not.toHaveBeenCalled()
  })

  it("falls back to dimension columns for entities without curated lists", () => {
    const entity = getDataSource("tasks")
    const meta = getListMeta(entity)
    expect(meta.columns.length).toBeGreaterThan(0)
    expect(meta.columns[0].get({ status: "open" })).toBe("open")
  })
})

describe("widget config panel scope controls", () => {
  const shifts = [
    makeShift({ id: "a", status: "completed" }),
    makeShift({ id: "b", status: "completed" }),
    makeShift({ id: "c", status: "cancelled" }),
  ]

  it("adds a filter through the Scope section", () => {
    const onChange = vi.fn()
    const widget = createWidget({ source: "shifts", visualization: "metric" })
    render(<WidgetConfigPanel widget={widget} records={shifts} onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Add filter" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const updates = onChange.mock.calls[0][0]
    expect(updates.filters).toHaveLength(1)
    expect(updates.filters[0].dimension).toBe("status")
    expect(updates.filters[0].values).toEqual([])
  })

  it("lists distinct values with counts and toggles them", () => {
    const onChange = vi.fn()
    const widget = createWidget({
      source: "shifts",
      visualization: "metric",
      filters: [{ id: "f1", dimension: "status", values: [] }],
    })
    render(<WidgetConfigPanel widget={widget} records={shifts} onChange={onChange} />)

    const checkbox = screen.getByRole("checkbox", { name: /completed/ })
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith({
      filters: [{ id: "f1", dimension: "status", values: ["completed"] }],
    })
  })

  it("changes the date window", () => {
    const onChange = vi.fn()
    const widget = createWidget({ source: "shifts", visualization: "metric" })
    render(<WidgetConfigPanel widget={widget} records={shifts} onChange={onChange} />)

    fireEvent.change(screen.getByDisplayValue("All time"), { target: { value: "last30" } })
    expect(onChange).toHaveBeenCalledWith({ dateWindow: "last30" })
  })
})
