"use client"

import { useCallback, useMemo, useState } from "react"
import type { ListQuerySort, ListQueryState } from "@/lib/list-query/types"

export function useListQueryState(initial?: Partial<ListQueryState>) {
  const [filters, setFilters] = useState<Record<string, string[]>>(initial?.filters ?? {})
  const [search, setSearch] = useState(initial?.search ?? "")
  const [sort, setSort] = useState<ListQuerySort | null>(initial?.sort ?? null)

  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }))
  }, [])

  const handleSelectSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      }
      return { key, dir: "asc" }
    })
  }, [])

  const clearSort = useCallback(() => setSort(null), [])

  const state = useMemo<ListQueryState>(
    () => ({ filters, search, sort }),
    [filters, search, sort],
  )

  return {
    state,
    filters,
    search,
    sort,
    setSearch,
    setFilters,
    setSort,
    handleFilterChange,
    handleSelectSort,
    clearSort,
  }
}
