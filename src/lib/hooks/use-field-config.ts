"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  getDefaultFields,
  participantFieldToColumnKey,
  contactFieldToColumnKey,
  staffFieldToColumnKey,
  type FieldDefinition,
  type EntityTab,
} from "@/lib/field-definitions"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"

function deriveFields(hiddenFields: string[]): FieldDefinition[] {
  const hiddenSet = new Set(hiddenFields)
  return getDefaultFields().map((f) => ({
    ...f,
    isEnabled: !hiddenSet.has(f.id),
  }))
}

export function useFieldConfig() {
  const { activeWorkspace } = useWorkspace()
  const [hiddenFields, setHiddenFields] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const workspaceId = activeWorkspace?.id

  useEffect(() => {
    if (!workspaceId || !isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      const { data, error } = await supabase
        .from("field_config")
        .select("hidden_fields")
        .eq("workspace_id", workspaceId)
        .single()

      if (cancelled) return

      if (data) {
        setHiddenFields(data.hidden_fields ?? [])
      } else if (error?.code === "PGRST116") {
        const { data: inserted } = await supabase
          .from("field_config")
          .upsert(
            { workspace_id: workspaceId, hidden_fields: [] },
            { onConflict: "workspace_id" },
          )
          .select("hidden_fields")
          .single()

        if (!cancelled) setHiddenFields(inserted?.hidden_fields ?? [])
      }

      if (!cancelled) setIsLoading(false)
    }

    load().catch((err) => {
      console.error("Failed to load field config:", err)
      if (!cancelled) setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [workspaceId])

  const fields = useMemo(() => deriveFields(hiddenFields), [hiddenFields])

  const toggleField = useCallback(async (fieldId: string) => {
    if (!workspaceId || !isSupabaseConfigured()) return

    const supabase = createClient()
    if (!supabase) return

    const nextHidden = hiddenFields.includes(fieldId)
      ? hiddenFields.filter((id) => id !== fieldId)
      : [...hiddenFields, fieldId]

    setHiddenFields(nextHidden)

    const { error } = await supabase
      .from("field_config")
      .upsert(
        {
          workspace_id: workspaceId,
          hidden_fields: nextHidden,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" },
      )

    if (error) {
      console.error("Failed to persist field config:", error)
      setHiddenFields(hiddenFields)
    }
  }, [workspaceId, hiddenFields])

  const getDisabledColumnKeys = useCallback((entity: EntityTab): Set<string> => {
    const mapping = entity === "participants"
      ? participantFieldToColumnKey
      : entity === "contacts"
        ? contactFieldToColumnKey
        : staffFieldToColumnKey

    const disabled = new Set<string>()
    for (const field of fields) {
      if (field.entity !== entity) continue
      if (field.isEnabled) continue
      const colKey = mapping[field.id]
      if (colKey) disabled.add(colKey)
    }
    return disabled
  }, [fields])

  const participantDisabled = useMemo(() => getDisabledColumnKeys("participants"), [getDisabledColumnKeys])
  const contactDisabled = useMemo(() => getDisabledColumnKeys("contacts"), [getDisabledColumnKeys])
  const staffDisabled = useMemo(() => getDisabledColumnKeys("staff"), [getDisabledColumnKeys])

  const isFieldEnabled = useCallback((fieldId: string): boolean => {
    const field = fields.find((f) => f.id === fieldId)
    if (!field) return true
    return field.isEnabled
  }, [fields])

  return {
    fields,
    participantDisabled,
    contactDisabled,
    staffDisabled,
    isFieldEnabled,
    toggleField,
    isLoading,
  }
}
