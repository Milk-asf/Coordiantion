export function matchesTableSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return fields.some((field) => field?.toLowerCase().includes(normalized))
}
