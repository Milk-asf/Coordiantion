import { describe, it, expect } from "vitest"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in_progress" | "done"
  assignee: string
  client: string
  clientId: string | null
  dueDate: string | null
  attachments: unknown[]
  chargeType: string
  timeSpent: number
  secondaryChargeType: string
  secondaryTimeSpent: number
  isCheckUp: boolean
}

interface TaskRow {
  id: string
  title: string
  description: string | null
  status: Task["status"] | null
  assignee: string | null
  client_name: string | null
  client_id: string | null
  due_date: string | null
  attachments: unknown[] | null
  charge_type: string | null
  time_spent: number | null
  secondary_charge_type: string | null
  secondary_time_spent: number | null
  is_check_up: boolean | null
}

function dbToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    status: row.status || "todo",
    assignee: row.assignee || "",
    client: row.client_name || "",
    clientId: row.client_id || null,
    dueDate: row.due_date || null,
    attachments: row.attachments || [],
    chargeType: row.charge_type || "",
    timeSpent: row.time_spent || 0,
    secondaryChargeType: row.secondary_charge_type || "",
    secondaryTimeSpent: row.secondary_time_spent || 0,
    isCheckUp: row.is_check_up || false,
  }
}

function getNextCheckUpDate(currentDue: string | null, period: string): string {
  const base = currentDue ? new Date(currentDue + "T00:00:00") : new Date()
  const next = new Date(base)
  switch (period) {
    case "Weekly": next.setDate(next.getDate() + 7); break
    case "Fortnightly": next.setDate(next.getDate() + 14); break
    case "Monthly": next.setMonth(next.getMonth() + 1); break
    case "Quarterly": next.setMonth(next.getMonth() + 3); break
    default: next.setMonth(next.getMonth() + 1); break
  }
  return next.toISOString().split("T")[0]
}

describe("dbToTask", () => {
  it("maps a full database row to a Task", () => {
    const row: TaskRow = {
      id: "task-1",
      title: "Do the thing",
      description: "A longer description",
      status: "in_progress",
      assignee: "Alice",
      client_name: "Bob Corp",
      client_id: "client-123",
      due_date: "2026-05-01",
      attachments: [{ name: "file.pdf", url: "http://example.com/file.pdf" }],
      charge_type: "01_002",
      time_spent: 45,
      secondary_charge_type: "01_003",
      secondary_time_spent: 15,
      is_check_up: true,
    }

    const task = dbToTask(row)

    expect(task.id).toBe("task-1")
    expect(task.title).toBe("Do the thing")
    expect(task.description).toBe("A longer description")
    expect(task.status).toBe("in_progress")
    expect(task.assignee).toBe("Alice")
    expect(task.client).toBe("Bob Corp")
    expect(task.clientId).toBe("client-123")
    expect(task.dueDate).toBe("2026-05-01")
    expect(task.attachments).toHaveLength(1)
    expect(task.chargeType).toBe("01_002")
    expect(task.timeSpent).toBe(45)
    expect(task.secondaryChargeType).toBe("01_003")
    expect(task.secondaryTimeSpent).toBe(15)
    expect(task.isCheckUp).toBe(true)
  })

  it("handles null/missing values with defaults", () => {
    const row: TaskRow = {
      id: "task-2",
      title: "Minimal",
      description: null,
      status: null,
      assignee: null,
      client_name: null,
      client_id: null,
      due_date: null,
      attachments: null,
      charge_type: null,
      time_spent: null,
      secondary_charge_type: null,
      secondary_time_spent: null,
      is_check_up: null,
    }

    const task = dbToTask(row)

    expect(task.description).toBe("")
    expect(task.status).toBe("todo")
    expect(task.assignee).toBe("")
    expect(task.client).toBe("")
    expect(task.clientId).toBeNull()
    expect(task.dueDate).toBeNull()
    expect(task.attachments).toEqual([])
    expect(task.chargeType).toBe("")
    expect(task.timeSpent).toBe(0)
    expect(task.isCheckUp).toBe(false)
  })
})

describe("getNextCheckUpDate", () => {
  function expectedDate(dateStr: string, addFn: (d: Date) => void): string {
    const base = new Date(dateStr + "T00:00:00")
    const next = new Date(base)
    addFn(next)
    return next.toISOString().split("T")[0]
  }

  it("adds 7 days for Weekly", () => {
    const result = getNextCheckUpDate("2026-05-01", "Weekly")
    expect(result).toBe(expectedDate("2026-05-01", (d) => d.setDate(d.getDate() + 7)))
  })

  it("adds 14 days for Fortnightly", () => {
    const result = getNextCheckUpDate("2026-05-01", "Fortnightly")
    expect(result).toBe(expectedDate("2026-05-01", (d) => d.setDate(d.getDate() + 14)))
  })

  it("adds 1 month for Monthly", () => {
    const result = getNextCheckUpDate("2026-05-15", "Monthly")
    expect(result).toBe(expectedDate("2026-05-15", (d) => d.setMonth(d.getMonth() + 1)))
  })

  it("adds 3 months for Quarterly", () => {
    const result = getNextCheckUpDate("2026-01-15", "Quarterly")
    expect(result).toBe(expectedDate("2026-01-15", (d) => d.setMonth(d.getMonth() + 3)))
  })

  it("defaults to Monthly for unknown period", () => {
    const result = getNextCheckUpDate("2026-03-10", "Unknown")
    expect(result).toBe(expectedDate("2026-03-10", (d) => d.setMonth(d.getMonth() + 1)))
  })

  it("uses current date when due date is null", () => {
    const result = getNextCheckUpDate(null, "Weekly")
    const expected = new Date()
    expected.setDate(expected.getDate() + 7)
    expect(result).toBe(expected.toISOString().split("T")[0])
  })
})

describe("Task status transitions", () => {
  it("marks a todo task as done", () => {
    const task: Task = {
      id: "t-1",
      title: "Follow up call",
      description: "",
      status: "todo",
      assignee: "John",
      client: "Client A",
      clientId: "c-1",
      dueDate: "2026-05-01",
      attachments: [],
      chargeType: "01_001",
      timeSpent: 0,
      secondaryChargeType: "",
      secondaryTimeSpent: 0,
      isCheckUp: false,
    }

    const updated = { ...task, status: "done" as const }
    expect(updated.status).toBe("done")
  })

  it("task with check-up flag triggers next check-up date calculation", () => {
    const task: Task = {
      id: "t-2",
      title: "Monthly check-up",
      description: "",
      status: "todo",
      assignee: "Sarah",
      client: "Client B",
      clientId: "c-2",
      dueDate: "2026-04-15",
      attachments: [],
      chargeType: "01_002",
      timeSpent: 60,
      secondaryChargeType: "",
      secondaryTimeSpent: 0,
      isCheckUp: true,
    }

    const nextDue = getNextCheckUpDate(task.dueDate, "Monthly")
    const expected = new Date("2026-04-15T00:00:00")
    expected.setMonth(expected.getMonth() + 1)
    expect(nextDue).toBe(expected.toISOString().split("T")[0])
  })
})
