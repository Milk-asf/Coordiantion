import type { QueryField } from "@/lib/list-query/types"

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function formatNumber(value: number, format: QueryField["format"]): string {
  if (format === "currency") {
    return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (format === "hours") return `${value.toLocaleString("en-AU", { maximumFractionDigits: 1 })}h`
  return value.toLocaleString("en-AU")
}

export function formatQueryFieldValue(field: QueryField, record: unknown): string {
  const raw = field.get(record)
  if (raw === null || raw === undefined || raw === "") return "—"
  if (field.kind === "boolean") return raw ? "Yes" : "No"
  if (field.kind === "number") return formatNumber(Number(raw) || 0, field.format)
  if (field.kind === "date") return formatDate(String(raw))
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—"
  return String(raw)
}
