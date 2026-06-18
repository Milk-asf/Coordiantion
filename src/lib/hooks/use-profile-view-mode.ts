"use client"

import { useCallback, useEffect, useState } from "react"

export type ProfileViewMode = "table" | "card"

const STORAGE_KEY = "profile-documents-view-mode"

export function useProfileViewMode() {
  const [viewMode, setViewModeState] = useState<ProfileViewMode>("table")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "table" || stored === "card") setViewModeState(stored)
  }, [])

  const setViewMode = useCallback((mode: ProfileViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  return { viewMode, setViewMode }
}
