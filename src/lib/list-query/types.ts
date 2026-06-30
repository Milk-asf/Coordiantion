export type QueryFieldKind = "text" | "number" | "date" | "boolean" | "category"

export type QueryFieldFormat = "number" | "currency" | "hours"

export interface QueryField {
  key: string
  label: string
  kind: QueryFieldKind
  format?: QueryFieldFormat
  get: (record: unknown) => unknown
  filterable?: boolean
  sortable?: boolean
  searchable?: boolean
}

export type SortDir = "asc" | "desc"

export interface ListQuerySort {
  key: string
  dir: SortDir
}

export interface ListQueryState {
  filters: Record<string, string[]>
  search: string
  sort: ListQuerySort | null
}

export const emptyListQueryState: ListQueryState = {
  filters: {},
  search: "",
  sort: null,
}
