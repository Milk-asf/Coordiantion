"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { WorkspaceEmailSettings } from "@/lib/types"

const defaultSettings: WorkspaceEmailSettings = {
  orgName: "",
  orgAbn: "",
  ndisNumber: "",
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
  primaryColor: "#3b82f6",
}

function rowToSettings(row: Record<string, unknown>): WorkspaceEmailSettings {
  return {
    orgName: (row.org_name as string) ?? "",
    orgAbn: (row.org_abn as string) ?? "",
    ndisNumber: (row.ndis_number as string) ?? "",
    orgPhone: (row.org_phone as string) ?? "",
    orgEmail: (row.org_email as string) ?? "",
    orgAddress: (row.org_address as string) ?? "",
    replyToEmail: "",
    emailFooter: "",
    bankName: (row.bank_name as string) ?? "",
    bankBsb: (row.bank_bsb as string) ?? "",
    bankAccountNumber: (row.bank_account as string) ?? "",
    bankAccountName: (row.bank_account_name as string) ?? "",
    logoUrl: (row.logo_url as string) ?? "",
    primaryColor: (row.primary_color as string) || "#3b82f6",
  }
}

function settingsToRow(settings: Partial<WorkspaceEmailSettings>) {
  const row: Record<string, string> = {}
  if (settings.orgName !== undefined) row.org_name = settings.orgName
  if (settings.orgAbn !== undefined) row.org_abn = settings.orgAbn
  if (settings.ndisNumber !== undefined) row.ndis_number = settings.ndisNumber
  if (settings.orgPhone !== undefined) row.org_phone = settings.orgPhone
  if (settings.orgEmail !== undefined) row.org_email = settings.orgEmail
  if (settings.orgAddress !== undefined) row.org_address = settings.orgAddress
  if (settings.bankName !== undefined) row.bank_name = settings.bankName
  if (settings.bankBsb !== undefined) row.bank_bsb = settings.bankBsb
  if (settings.bankAccountNumber !== undefined) row.bank_account = settings.bankAccountNumber
  if (settings.bankAccountName !== undefined) row.bank_account_name = settings.bankAccountName
  if (settings.logoUrl !== undefined) row.logo_url = settings.logoUrl
  if (settings.primaryColor !== undefined) row.primary_color = settings.primaryColor
  return row
}

export function useWorkspaceSettings() {
  const { activeWorkspace } = useWorkspace()
  const [settings, setSettings] = useState<WorkspaceEmailSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace?.id || !isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) { setIsLoading(false); return }

    let cancelled = false

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .single()

      if (cancelled) return

      if (data) {
        setSettings(rowToSettings(data))
        setIsLoading(false)
        return
      }

      if (error && error.code === "PGRST116") {
        const { data: inserted } = await supabase
          .from("workspace_settings")
          .upsert({ workspace_id: activeWorkspace.id }, { onConflict: "workspace_id" })
          .select("*")
          .single()

        if (cancelled) return
        if (inserted) setSettings(rowToSettings(inserted))
      }

      setIsLoading(false)
    }

    setIsLoading(true)
    fetchSettings().catch((err) => {
      console.error("Failed to load workspace settings:", err)
      if (!cancelled) setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [activeWorkspace?.id])

  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    root.style.setProperty("--primary-color", "#111111")
    root.style.setProperty("--primary-color-hover", "#333333")
    root.style.setProperty("--primary-color-light", "rgba(17, 17, 17, 0.06)")
    root.style.setProperty("--primary-color-text", "#111111")
    root.style.setProperty("--primary-btn-text", "#ffffff")
    root.style.setProperty("--primary-btn-border", "#1a1a1a")
  }, [])

  const updateSettings = useCallback(async (updates: Partial<WorkspaceEmailSettings>) => {
    if (!activeWorkspace?.id || !isSupabaseConfigured()) return

    const supabase = createClient()
    if (!supabase) return

    const next = { ...settings, ...updates }
    setSettings(next)

    const row = settingsToRow(updates)
    if (Object.keys(row).length === 0) return

    const { error } = await supabase
      .from("workspace_settings")
      .upsert({ workspace_id: activeWorkspace.id, ...row }, { onConflict: "workspace_id" })

    if (error) console.error("Failed to save workspace settings:", error)
  }, [activeWorkspace?.id, settings])

  return { settings, updateSettings, isLoading }
}
