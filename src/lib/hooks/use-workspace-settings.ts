"use client"

import { useState, useEffect, useCallback } from "react"
import type { WorkspaceEmailSettings } from "@/lib/types"

const STORAGE_KEY = "coordination:workspace-settings"

const defaultSettings: WorkspaceEmailSettings = {
  orgName: "",
  orgAbn: "",
  orgPhone: "",
  orgEmail: "",
  orgAddress: "",
  replyToEmail: "",
  emailFooter: "",
  bankName: "",
  bankBsb: "",
  bankAccountNumber: "",
  bankAccountName: "",
  logoUrl: "",
}

function loadSettings(): WorkspaceEmailSettings {
  if (typeof window === "undefined") return defaultSettings
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try { return { ...defaultSettings, ...JSON.parse(stored) } } catch { /* fall through */ }
  }
  return defaultSettings
}

function saveSettings(settings: WorkspaceEmailSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new Event("workspace-settings-updated"))
}

export function useWorkspaceSettings() {
  const [settings, setSettings] = useState<WorkspaceEmailSettings>(defaultSettings)

  useEffect(() => {
    setSettings(loadSettings())

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSettings(loadSettings())
    }
    const handleCustom = () => setSettings(loadSettings())

    window.addEventListener("storage", handleStorage)
    window.addEventListener("workspace-settings-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("workspace-settings-updated", handleCustom)
    }
  }, [])

  const updateSettings = useCallback((updates: Partial<WorkspaceEmailSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, updateSettings }
}
