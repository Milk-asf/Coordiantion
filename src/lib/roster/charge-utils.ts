export function normalizeShiftChargeTypes(
  value: unknown,
  legacyChargeType?: string | null
): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, items) => items.indexOf(item) === index)
  }

  if (typeof legacyChargeType === "string" && legacyChargeType.trim()) {
    return [legacyChargeType.trim()]
  }

  return []
}

export function primaryShiftChargeType(chargeTypes: string[]): string {
  return chargeTypes[0] ?? ""
}
