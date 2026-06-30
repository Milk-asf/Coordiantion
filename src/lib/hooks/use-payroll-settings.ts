"use client"

import { useCallback, useEffect, useState } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import type { EmploymentType } from "@/lib/payroll/schads"

/**
 * Per-staff payroll configuration used to compute pay runs. Stored locally per
 * workspace so finance can set base rates without a schema migration; when the
 * Xero Payroll connection is live these map onto Xero employee earnings rates.
 */
export interface StaffPayConfig {
  baseRate: number
  employmentType: EmploymentType
  level: string
}

export const defaultPayConfig: StaffPayConfig = {
  baseRate: 0,
  employmentType: "casual",
  level: "2",
}

type PayConfigMap = Record<string, StaffPayConfig>

function storageKey(workspaceId: string): string {
  return `payroll-config-${workspaceId}`
}

function loadConfigs(workspaceId: string | undefined): PayConfigMap {
  if (typeof window === "undefined" || !workspaceId) return {}
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    return raw ? (JSON.parse(raw) as PayConfigMap) : {}
  } catch {
    return {}
  }
}

export function usePayrollSettings() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const [configs, setConfigs] = useState<PayConfigMap>({})

  useEffect(() => {
    setConfigs(loadConfigs(workspaceId))
  }, [workspaceId])

  const getConfig = useCallback(
    (staffId: string): StaffPayConfig => configs[staffId] ?? defaultPayConfig,
    [configs],
  )

  const setConfig = useCallback(
    (staffId: string, updates: Partial<StaffPayConfig>) => {
      setConfigs((current) => {
        const next: PayConfigMap = {
          ...current,
          [staffId]: { ...(current[staffId] ?? defaultPayConfig), ...updates },
        }
        if (typeof window !== "undefined" && workspaceId) {
          localStorage.setItem(storageKey(workspaceId), JSON.stringify(next))
        }
        return next
      })
    },
    [workspaceId],
  )

  return { getConfig, setConfig }
}
