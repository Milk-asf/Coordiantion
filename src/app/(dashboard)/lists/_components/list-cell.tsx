import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { getFolkStatusClass } from "@/lib/folk-ui"
import { TABLE_CHIP } from "@/lib/table-styles"
import type { ListField } from "@/lib/lists/definitions"

export function formatListDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDate(value: string): string {
  return formatListDate(value)
}

function formatNumber(value: number, format: ListField["format"]): string {
  if (format === "currency") return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (format === "hours") return `${value.toLocaleString("en-AU", { maximumFractionDigits: 1 })}h`
  return value.toLocaleString("en-AU")
}

export function formatFieldValue(field: ListField, record: unknown): string {
  const raw = field.get(record)
  if (raw === null || raw === undefined || raw === "") return "—"
  if (field.kind === "boolean") return raw ? "Yes" : "No"
  if (field.kind === "number") return formatNumber(Number(raw) || 0, field.format)
  if (field.kind === "date") return formatDate(String(raw))
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—"
  return String(raw)
}

interface ListCellProps {
  field: ListField
  record: unknown
}

export function ListCell({ field, record }: ListCellProps) {
  const display = formatFieldValue(field, record)

  if (display === "—") return <span className="text-[13px] text-folk-tertiary">—</span>

  if (field.kind === "category" || field.kind === "boolean") {
    return (
      <span
        className={cn(
          "folk-chip inline-flex h-[20px] max-w-full items-center truncate px-[8px] text-[11px] font-medium capitalize",
          getFolkStatusClass(display),
        )}
      >
        {display.replace(/-/g, " ")}
      </span>
    )
  }

  if (field.kind === "number") return <span className="text-[13px] tabular-nums text-folk-text">{display}</span>
  if (field.kind === "date") {
    return (
      <span className={cn(TABLE_CHIP, "gap-[4px]")}>
        <CalendarDays className="h-[11px] w-[11px] shrink-0" strokeWidth={1.75} />
        {display}
      </span>
    )
  }

  return <span className="truncate text-[13px] text-folk-text">{display}</span>
}
