"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ensureStringArray } from "@/lib/ensure-array"

interface SavedViewBase {
  id: string
  name: string
}

interface UseSavedViewsParams<TView extends SavedViewBase> {
  viewsStorageKey: string
  activeViewStorageKey: string
  buildView: (params: { id: string; name: string }) => TView
  applyView: (view: TView) => void
  resetState: () => void
  syncView: (view: TView) => TView
  /** Normalizes views restored from localStorage before they are applied. */
  sanitizeView?: (view: TView) => TView
  /** When set, coerces a legacy `columnKeys` field before apply/sanitize. */
  defaultColumnKeys?: string[]
}

export function useSavedViews<TView extends SavedViewBase>({
  viewsStorageKey,
  activeViewStorageKey,
  buildView,
  applyView,
  resetState,
  syncView,
  sanitizeView,
  defaultColumnKeys,
}: UseSavedViewsParams<TView>) {
  const [savedViews, setSavedViews] = useState<TView[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const parsed = JSON.parse(localStorage.getItem(viewsStorageKey) || "[]")
      return Array.isArray(parsed) ? (parsed as TView[]) : []
    } catch { return [] }
  })
  const [activeViewId, setActiveViewId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(activeViewStorageKey) || null
  })
  const isInitialMount = useRef(true)

  const syncViewRef = useRef(syncView)
  syncViewRef.current = syncView
  const buildViewRef = useRef(buildView)
  buildViewRef.current = buildView
  const applyViewRef = useRef(applyView)
  applyViewRef.current = applyView
  const resetStateRef = useRef(resetState)
  resetStateRef.current = resetState
  const sanitizeViewRef = useRef(sanitizeView)
  sanitizeViewRef.current = sanitizeView

  const resolveView = useCallback((view: TView) => {
    let resolved = view
    if (defaultColumnKeys && typeof view === "object" && view !== null && "columnKeys" in view) {
      const record = view as TView & { columnKeys?: unknown }
      resolved = {
        ...view,
        columnKeys: ensureStringArray(record.columnKeys, defaultColumnKeys),
      } as TView
    }
    return sanitizeViewRef.current ? sanitizeViewRef.current(resolved) : resolved
  }, [defaultColumnKeys])

  useEffect(() => {
    if (activeViewId) {
      const activeView = savedViews.find((view) => view.id === activeViewId)
      if (activeView) applyViewRef.current(resolveView(activeView))
    }
    isInitialMount.current = false
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isInitialMount.current) return
    localStorage.setItem(viewsStorageKey, JSON.stringify(savedViews))
  }, [savedViews, viewsStorageKey])

  useEffect(() => {
    if (isInitialMount.current) return
    if (activeViewId) localStorage.setItem(activeViewStorageKey, activeViewId)
    else localStorage.removeItem(activeViewStorageKey)
  }, [activeViewId, activeViewStorageKey])

  const syncActiveView = useCallback(() => {
    if (!activeViewId || isInitialMount.current) return

    setSavedViews((previousViews) =>
      previousViews.map((view) => view.id === activeViewId ? syncViewRef.current(view) : view)
    )
  }, [activeViewId])

  const createView = useCallback((name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return null

    const view = buildViewRef.current({
      id: Date.now().toString(),
      name: trimmedName,
    })

    setSavedViews((previousViews) => [...previousViews, view])
    setActiveViewId(view.id)

    return view
  }, [])

  const selectView = useCallback((view: TView) => {
    setActiveViewId(view.id)
    applyViewRef.current(resolveView(view))
  }, [resolveView])

  const selectDefaultView = useCallback(() => {
    setActiveViewId(null)
    resetStateRef.current()
  }, [])

  const deleteView = useCallback((viewId: string) => {
    setSavedViews((previousViews) => previousViews.filter((view) => view.id !== viewId))
    setActiveViewId((prev) => {
      if (prev === viewId) {
        resetStateRef.current()
        return null
      }
      return prev
    })
  }, [])

  const activeView = useMemo(
    () => savedViews.find((view) => view.id === activeViewId) || null,
    [activeViewId, savedViews]
  )

  return {
    savedViews,
    activeView,
    activeViewId,
    setSavedViews,
    setActiveViewId,
    createView,
    selectView,
    selectDefaultView,
    deleteView,
    syncActiveView,
  }
}
