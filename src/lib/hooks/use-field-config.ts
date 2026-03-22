"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  getDefaultFields,
  FIELD_CONFIG_STORAGE_KEY,
  participantFieldToColumnKey,
  contactFieldToColumnKey,
  staffFieldToColumnKey,
  type FieldDefinition,
  type EntityTab,
} from "@/lib/field-definitions"

function loadFields(): FieldDefinition[] {
  if (typeof window === "undefined") return getDefaultFields()
  const stored = localStorage.getItem(FIELD_CONFIG_STORAGE_KEY)
  if (!stored) return getDefaultFields()
  try { return JSON.parse(stored) } catch { return getDefaultFields() }
}

export function useFieldConfig() {
  const [fields, setFields] = useState<FieldDefinition[]>(getDefaultFields)

  useEffect(() => {
    setFields(loadFields())

    const handleStorage = (e: StorageEvent) => {
      if (e.key === FIELD_CONFIG_STORAGE_KEY) setFields(loadFields())
    }

    const handleCustom = () => setFields(loadFields())

    window.addEventListener("storage", handleStorage)
    window.addEventListener("field-config-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("field-config-updated", handleCustom)
    }
  }, [])

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

  return { fields, participantDisabled, contactDisabled, staffDisabled }
}
