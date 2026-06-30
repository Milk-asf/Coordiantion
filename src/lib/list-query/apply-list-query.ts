import { matchesTableSearch } from "@/lib/table-search"
import { formatQueryFieldValue } from "@/lib/list-query/format-query-field-value"
import type { ListQueryState, QueryField } from "@/lib/list-query/types"

export interface ApplyListQueryOptions<T> {
  fields: QueryField[]
  formatValue?: (field: QueryField, record: unknown) => string
  matchFilter?: (field: QueryField, record: T, values: string[]) => boolean
  defaultFilter?: (record: T) => boolean
  searchFields?: QueryField[]
}

function compareQueryValues<T>(
  field: QueryField,
  a: T,
  b: T,
  formatValue: (field: QueryField, record: unknown) => string,
): number {
  const rawA = field.get(a)
  const rawB = field.get(b)

  if (field.kind === "number") return (Number(rawA) || 0) - (Number(rawB) || 0)

  if (field.kind === "date") {
    return (
      (new Date(String(rawA ?? "")).getTime() || 0) -
      (new Date(String(rawB ?? "")).getTime() || 0)
    )
  }

  return formatValue(field, a).localeCompare(formatValue(field, b))
}

export function applyListQuery<T>(
  records: T[],
  state: ListQueryState,
  options: ApplyListQueryOptions<T>,
): T[] {
  const {
    fields,
    formatValue = formatQueryFieldValue,
    matchFilter,
    defaultFilter,
    searchFields,
  } = options

  let out = records

  if (defaultFilter) out = out.filter(defaultFilter)

  const activeFilterKeys = Object.keys(state.filters).filter(
    (key) => (state.filters[key]?.length ?? 0) > 0,
  )

  if (activeFilterKeys.length > 0) {
    out = out.filter((record) =>
      activeFilterKeys.every((key) => {
        const field = fields.find((item) => item.key === key)
        if (!field) return true
        const values = state.filters[key] ?? []
        if (matchFilter) return matchFilter(field, record, values)
        return values.includes(formatValue(field, record))
      }),
    )
  }

  const query = state.search.trim()
  if (query) {
    const searchable =
      searchFields ??
      fields.filter((field) => field.searchable !== false && field.kind !== "number")
    out = out.filter((record) =>
      matchesTableSearch(
        query,
        ...searchable.map((field) => formatValue(field, record)),
      ),
    )
  }

  if (state.sort) {
    const field = fields.find((item) => item.key === state.sort?.key && item.sortable !== false)
    if (field) {
      out = [...out].sort((a, b) => {
        const cmp = compareQueryValues(field, a, b, formatValue)
        return state.sort?.dir === "asc" ? cmp : -cmp
      })
    }
  }

  return out
}

export function buildFilterOptions<T>(
  records: T[],
  fields: QueryField[],
  formatValue: (field: QueryField, record: unknown) => string = formatQueryFieldValue,
): Record<string, string[]> {
  const options: Record<string, string[]> = {}

  for (const field of fields) {
    if (field.filterable === false) continue
    if (field.kind !== "category" && field.kind !== "boolean") continue

    const values = new Set<string>()
    for (const record of records) {
      const value = formatValue(field, record)
      if (value && value !== "—") values.add(value)
    }
    options[field.key] = [...values].sort()
  }

  return options
}
