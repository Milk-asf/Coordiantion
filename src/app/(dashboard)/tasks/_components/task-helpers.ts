import {
  CalendarDays,
  Building2,
  FileText,
  User,
  Tag,
  Clock,
  CheckSquare,
} from "lucide-react"

export interface TaskSavedView {
  id: string
  name: string
  viewMode: "list" | "week"
  visibleColumnKeys: string[]
}

export const taskColumnDefs = [
  { key: "checkbox", label: "Status", icon: CheckSquare, width: "32px", alwaysVisible: true },
  { key: "date", label: "Date", icon: CalendarDays, width: "90px" },
  { key: "participant", label: "Client", icon: Building2, width: "40px" },
  { key: "title", label: "Title", icon: FileText, width: "1fr", alwaysVisible: true },
  { key: "assignee", label: "Assignee", icon: User, width: "40px" },
  { key: "charge", label: "Charge", icon: Tag, width: "64px" },
  { key: "time", label: "Time", icon: Clock, width: "56px" },
] as const

export const defaultTaskVisibleKeys = ["checkbox", "date", "participant", "title", "assignee", "charge", "time"]

export function formatTime(minutes: number): string {
  if (minutes === 0) return "0m"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function parseTimeInput(val: string): number {
  if (!val.trim()) return 0
  const hMatch = val.match(/(\d+)\s*h/)
  const mMatch = val.match(/(\d+)\s*m/)
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0
  if (hours === 0 && mins === 0) {
    const num = parseInt(val, 10)
    return isNaN(num) ? 0 : num
  }
  return hours * 60 + mins
}

export function formatRowDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + "T00:00:00")
  d.setHours(0, 0, 0, 0)
  const diff = d.getTime() - today.getTime()
  const dayMs = 86400000
  if (diff === 0) return "Today"
  if (diff === dayMs) return "Tomorrow"
  if (diff === -dayMs) return "Yesterday"
  if (diff > 0 && diff < 7 * dayMs) return d.toLocaleDateString("en-AU", { weekday: "long" })
  if (diff < 0 && diff > -7 * dayMs) return d.toLocaleDateString("en-AU", { weekday: "long" })
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
