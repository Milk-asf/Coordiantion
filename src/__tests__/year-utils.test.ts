import { describe, expect, it } from "vitest"
import { buildYearHeatmap, formatHeatmapHours, heatmapBucket, type YearHeatmapShift } from "@/lib/roster/year-utils"

function makeShift(
  date: string,
  overrides: Partial<YearHeatmapShift> = {}
): YearHeatmapShift {
  return {
    date,
    startTime: "09:00",
    endTime: "17:00",
    status: "scheduled",
    staffId: "staff-1",
    clientId: "client-1",
    ...overrides,
  }
}

describe("buildYearHeatmap", () => {
  it("covers every day of the year exactly once, in full weeks", () => {
    const heatmap = buildYearHeatmap(2025, [], 1, new Date(2025, 6, 1))

    const inYearDays = heatmap.weeks.flat().filter((day) => day.inYear)
    expect(inYearDays).toHaveLength(365)
    expect(inYearDays[0].dateStr).toBe("2025-01-01")
    expect(inYearDays[364].dateStr).toBe("2025-12-31")
    for (const week of heatmap.weeks) expect(week).toHaveLength(7)
  })

  it("handles leap years", () => {
    const heatmap = buildYearHeatmap(2024, [], 1, new Date(2024, 6, 1))
    expect(heatmap.weeks.flat().filter((day) => day.inYear)).toHaveLength(366)
    expect(heatmap.stats.daysInYear).toBe(366)
  })

  it("starts week columns on the configured day", () => {
    const mondayStart = buildYearHeatmap(2025, [], 1, new Date(2025, 6, 1))
    const sundayStart = buildYearHeatmap(2025, [], 0, new Date(2025, 6, 1))

    expect(new Date(`${mondayStart.weeks[0][0].dateStr}T00:00:00`).getDay()).toBe(1)
    expect(new Date(`${sundayStart.weeks[0][0].dateStr}T00:00:00`).getDay()).toBe(0)
    expect(mondayStart.dayRowLabels).toEqual(["Mon", null, "Wed", null, "Fri", null, null])
    expect(sundayStart.dayRowLabels).toEqual([null, "Mon", null, "Wed", null, "Fri", null])
  })

  it("labels all 12 months with spans that tile the columns exactly", () => {
    const heatmap = buildYearHeatmap(2025, [], 1, new Date(2025, 6, 1))
    expect(heatmap.monthLabels).toHaveLength(12)
    expect(heatmap.monthLabels[0]).toMatchObject({ weekIndex: 0, label: "Jan" })

    let expectedStart = 0
    for (const entry of heatmap.monthLabels) {
      expect(entry.weekIndex).toBe(expectedStart)
      expect(entry.span).toBeGreaterThanOrEqual(4)
      expectedStart += entry.span
    }
    expect(expectedStart).toBe(heatmap.weeks.length)
  })

  it("aggregates counts and hours per day, ignoring cancelled and out-of-year shifts", () => {
    const heatmap = buildYearHeatmap(
      2025,
      [
        makeShift("2025-03-10", { startTime: "09:00", endTime: "12:00" }),
        makeShift("2025-03-10", { startTime: "13:00", endTime: "17:30" }),
        makeShift("2025-03-10", { startTime: "08:00", endTime: "09:00", status: "cancelled" }),
        makeShift("2024-12-31"),
        makeShift("2026-01-01"),
      ],
      1,
      new Date(2025, 6, 1)
    )

    const day = heatmap.weeks.flat().find((entry) => entry.dateStr === "2025-03-10")
    expect(day?.count).toBe(2)
    expect(day?.hours).toBe(7.5)
    expect(heatmap.stats.totalShifts).toBe(2)
    expect(heatmap.stats.totalHours).toBe(7.5)
    expect(heatmap.stats.maxCount).toBe(2)
    expect(heatmap.stats.daysWithShifts).toBe(1)
  })

  it("computes the busiest month with its shift count and hours", () => {
    const heatmap = buildYearHeatmap(
      2025,
      [
        makeShift("2025-01-05"),
        makeShift("2025-02-10", { startTime: "09:00", endTime: "11:00" }),
        makeShift("2025-02-10", { startTime: "12:00", endTime: "14:00" }),
        makeShift("2025-02-14", { startTime: "09:00", endTime: "10:00" }),
      ],
      1,
      new Date(2025, 6, 1)
    )

    expect(heatmap.stats.mostActiveMonth).toEqual({ label: "February", count: 3, hours: 5 })
    expect(heatmap.stats.mostActiveDay?.dateStr).toBe("2025-02-10")
  })

  it("counts distinct staff and clients, excluding vacant shifts from staff", () => {
    const heatmap = buildYearHeatmap(
      2025,
      [
        makeShift("2025-04-01", { staffId: "staff-1", clientId: "client-1" }),
        makeShift("2025-04-02", { staffId: "staff-2", clientId: "client-1" }),
        makeShift("2025-04-03", { staffId: "staff-2", clientId: "client-2" }),
        makeShift("2025-04-04", { staffId: "", clientId: "client-3" }),
      ],
      1,
      new Date(2025, 6, 1)
    )

    expect(heatmap.stats.staffCount).toBe(2)
    expect(heatmap.stats.clientCount).toBe(3)
  })

  it("averages hours per week over the elapsed year to date for the current year", () => {
    // 28 hours of shifts by Jan 14 (day 14) → 14 hrs/week to date.
    const shifts = [
      makeShift("2025-01-03", { startTime: "09:00", endTime: "23:00" }),
      makeShift("2025-01-10", { startTime: "09:00", endTime: "23:00" }),
    ]
    const heatmap = buildYearHeatmap(2025, shifts, 1, new Date(2025, 0, 14))
    expect(heatmap.stats.avgHoursPerWeek).toBeCloseTo(14)
  })

  it("averages hours per week over the whole year for past years", () => {
    const shifts = [makeShift("2024-06-01", { startTime: "09:00", endTime: "17:00" })]
    const heatmap = buildYearHeatmap(2024, shifts, 1, new Date(2025, 6, 1))
    expect(heatmap.stats.avgHoursPerWeek).toBeCloseTo(8 / (366 / 7))
  })

  it("returns empty stats for a year with no shifts", () => {
    const heatmap = buildYearHeatmap(2025, [], 1, new Date(2025, 6, 1))
    expect(heatmap.stats.totalShifts).toBe(0)
    expect(heatmap.stats.mostActiveMonth).toBeNull()
    expect(heatmap.stats.mostActiveDay).toBeNull()
    expect(heatmap.stats.daysWithShifts).toBe(0)
    expect(heatmap.stats.avgHoursPerWeek).toBe(0)
    expect(heatmap.stats.staffCount).toBe(0)
    expect(heatmap.stats.clientCount).toBe(0)
  })
})

describe("heatmapBucket", () => {
  it("returns 0 for empty days", () => {
    expect(heatmapBucket(0, 10)).toBe(0)
    expect(heatmapBucket(0, 0)).toBe(0)
  })

  it("maps counts directly when the max is small", () => {
    expect(heatmapBucket(1, 3)).toBe(1)
    expect(heatmapBucket(2, 3)).toBe(2)
    expect(heatmapBucket(3, 3)).toBe(3)
    expect(heatmapBucket(4, 4)).toBe(4)
  })

  it("buckets by quartile of the max for larger ranges", () => {
    expect(heatmapBucket(5, 20)).toBe(1)
    expect(heatmapBucket(10, 20)).toBe(2)
    expect(heatmapBucket(15, 20)).toBe(3)
    expect(heatmapBucket(20, 20)).toBe(4)
  })
})

describe("formatHeatmapHours", () => {
  it("drops trailing zeros and rounds to one decimal", () => {
    expect(formatHeatmapHours(8)).toBe("8")
    expect(formatHeatmapHours(7.5)).toBe("7.5")
    expect(formatHeatmapHours(7.25)).toBe("7.3")
  })
})
