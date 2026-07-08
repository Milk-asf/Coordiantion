/** Coerce unknown persisted values into a string array for safe `.includes` / `.filter` use. */
export function ensureStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === "string")
}
