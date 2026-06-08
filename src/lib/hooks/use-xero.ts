"use client"

import { useState, useEffect, useCallback } from "react"
import { useWorkspace } from "@/lib/workspace-context"

export interface XeroStatus {
  connected: boolean
  tenantId?: string
  revenueAccountCode?: string
  salesTaxType?: string
  connectedAt?: string
}

export function useXero() {
  const { activeWorkspace } = useWorkspace()
  const [status, setStatus] = useState<XeroStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!activeWorkspace) {
      setStatus(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/xero/status?workspaceId=${activeWorkspace.id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to load Xero status")
      }
      setStatus((await res.json()) as XeroStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Xero status")
      setStatus({ connected: false })
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { refresh() }, [refresh])

  const connectUrl = activeWorkspace ? `/api/xero/connect?workspaceId=${activeWorkspace.id}` : "#"

  const saveSettings = useCallback(async (revenueAccountCode: string, salesTaxType: string): Promise<boolean> => {
    if (!activeWorkspace) return false
    const res = await fetch("/api/xero/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspace.id, revenueAccountCode, salesTaxType }),
    })
    if (res.ok) { await refresh(); return true }
    return false
  }, [activeWorkspace, refresh])

  const disconnect = useCallback(async (): Promise<boolean> => {
    if (!activeWorkspace) return false
    const res = await fetch("/api/xero/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspace.id }),
    })
    if (res.ok) { await refresh(); return true }
    return false
  }, [activeWorkspace, refresh])

  return { status, isLoading, error, refresh, connectUrl, saveSettings, disconnect }
}
