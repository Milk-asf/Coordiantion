"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
}

export function useSavedViews<TView extends SavedViewBase>({
  viewsStorageKey,
  activeViewStorageKey,
  buildView,
  applyView,
  resetState,
  syncView,
}: UseSavedViewsParams<TView>) {
  const [savedViews, setSavedViews] = useState<TView[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    try {
      const storedViews = JSON.parse(localStorage.getItem(viewsStorageKey) || "[]") as TView[]
      setSavedViews(storedViews)

      const storedActiveViewId = localStorage.getItem(activeViewStorageKey) || null
      setActiveViewId(storedActiveViewId)

      if (storedActiveViewId) {
        const activeView = storedViews.find((view) => view.id === storedActiveViewId)
        if (activeView) applyView(activeView)
      }
    } catch {
      setSavedViews([])
      setActiveViewId(null)
    }

    isInitialMount.current = false
    hasHydrated.current = true
  }, [activeViewStorageKey, applyView, viewsStorageKey])

  const hasHydrated = useRef(false)

  useEffect(() => {
    if (!hasHydrated.current) return
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
      previousViews.map((view) => view.id === activeViewId ? syncView(view) : view)
    )
  }, [activeViewId, syncView])

  const createView = useCallback((name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return null

    const view = buildView({
      id: Date.now().toString(),
      name: trimmedName,
    })

    setSavedViews((previousViews) => [...previousViews, view])
    setActiveViewId(view.id)

    return view
  }, [buildView])

  const selectView = useCallback((view: TView) => {
    setActiveViewId(view.id)
    applyView(view)
  }, [applyView])

  const selectDefaultView = useCallback(() => {
    setActiveViewId(null)
    resetState()
  }, [resetState])

  const deleteView = useCallback((viewId: string) => {
    setSavedViews((previousViews) => previousViews.filter((view) => view.id !== viewId))

    if (activeViewId === viewId) {
      setActiveViewId(null)
      resetState()
    }
  }, [activeViewId, resetState])

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
