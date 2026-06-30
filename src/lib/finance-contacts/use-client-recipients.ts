"use client"

import { useCallback, useEffect, useState } from "react"
import { useWorkspace } from "@/lib/workspace-context"

/**
 * Per-client finance recipient settings. Stored locally per workspace (no schema
 * migration needed yet, like payroll settings). Drives two flows:
 *  - invoiceContactId: which finance contact receives this client's invoices.
 *  - ndiaClaims: whether this participant's billables are claimed via the NDIA
 *    bulk payment request (gates which entries appear in NDIS claims).
 */
export interface ClientRecipientSettings {
  invoiceContactId: string | null
  ndiaClaims: boolean
}

export const defaultRecipientSettings: ClientRecipientSettings = {
  invoiceContactId: null,
  ndiaClaims: false,
}

type RecipientMap = Record<string, ClientRecipientSettings>

function storageKey(workspaceId: string): string {
  return `client-recipients-${workspaceId}`
}

function loadAll(workspaceId: string | undefined): RecipientMap {
  if (typeof window === "undefined" || !workspaceId) return {}
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    return raw ? (JSON.parse(raw) as RecipientMap) : {}
  } catch {
    return {}
  }
}

export function useClientRecipients() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const [recipients, setRecipients] = useState<RecipientMap>({})

  useEffect(() => {
    setRecipients(loadAll(workspaceId))
  }, [workspaceId])

  const getRecipient = useCallback(
    (clientId: string): ClientRecipientSettings => recipients[clientId] ?? defaultRecipientSettings,
    [recipients],
  )

  const setRecipient = useCallback(
    (clientId: string, updates: Partial<ClientRecipientSettings>) => {
      setRecipients((current) => {
        const next: RecipientMap = {
          ...current,
          [clientId]: { ...(current[clientId] ?? defaultRecipientSettings), ...updates },
        }
        if (typeof window !== "undefined" && workspaceId) {
          localStorage.setItem(storageKey(workspaceId), JSON.stringify(next))
        }
        return next
      })
    },
    [workspaceId],
  )

  return { recipients, getRecipient, setRecipient }
}
