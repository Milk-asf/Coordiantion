"use client"

import { useCallback, useEffect, useState } from "react"
import {
  defaultRosterSettings,
  loadRosterSettings,
  ROSTER_SETTINGS_CHANGED_EVENT,
  saveRosterSettings,
  type RosterSettings,
} from "@/lib/roster/settings"

export function useRosterSettings() {
  const [settings, setSettings] = useState<RosterSettings>(defaultRosterSettings)

  useEffect(() => {
    setSettings(loadRosterSettings())

    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<RosterSettings>).detail
      if (detail) {
        setSettings(detail)
        return
      }
      setSettings(loadRosterSettings())
    }

    window.addEventListener(ROSTER_SETTINGS_CHANGED_EVENT, handleChange)
    return () => window.removeEventListener(ROSTER_SETTINGS_CHANGED_EVENT, handleChange)
  }, [])

  const updateSettings = useCallback((patch: Partial<RosterSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch }
      saveRosterSettings(next)
      return loadRosterSettings()
    })
  }, [])

  return { settings, updateSettings }
}
