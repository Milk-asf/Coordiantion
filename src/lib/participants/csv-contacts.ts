import { relationshipConfig } from "@/lib/types"
import type { Contact } from "@/lib/types"

// Number of contacts that can be attached to a single participant row on import.
export const MAX_CSV_CONTACTS = 3

interface CsvColumn {
  key: string
  label: string
}

// Contact columns appended to the participant CSV template/import. Each
// participant row can carry up to MAX_CSV_CONTACTS contacts via numbered columns.
export const contactCsvColumns: CsvColumn[] = Array.from({ length: MAX_CSV_CONTACTS }).flatMap((_, i) => {
  const n = i + 1
  return [
    { key: `contact${n}Name`, label: `Contact ${n} Name` },
    { key: `contact${n}Relationship`, label: `Contact ${n} Relationship` },
    { key: `contact${n}Email`, label: `Contact ${n} Email` },
    { key: `contact${n}Phone`, label: `Contact ${n} Phone` },
  ]
})

// Maps a free-text relationship from a CSV (e.g. "Next of Kin" or "next-of-kin")
// to a known relationship slug when possible; otherwise returns the trimmed input
// so custom relationships are still preserved.
function normalizeRelationship(input: string): string {
  const trimmed = (input || "").trim()
  if (!trimmed) return ""

  const lower = trimmed.toLowerCase()
  if (relationshipConfig[lower]) return lower

  const slug = lower.replace(/\s+/g, "-")
  if (relationshipConfig[slug]) return slug

  const byLabel = Object.entries(relationshipConfig).find(
    ([, cfg]) => cfg.label.toLowerCase() === lower
  )
  if (byLabel) return byLabel[0]

  return trimmed
}

// Extracts the contacts present in a single participant CSV row, associating
// each one with the freshly-created participant (client) so it shows up under
// that participant in the workspace.
export function parseContactsFromCsvRow(
  row: Record<string, string>,
  client: { id: string; name: string }
): Omit<Contact, "id">[] {
  const contacts: Omit<Contact, "id">[] = []

  for (let n = 1; n <= MAX_CSV_CONTACTS; n++) {
    const name = (row[`contact${n}Name`] || "").trim()
    const email = (row[`contact${n}Email`] || "").trim()
    const phone = (row[`contact${n}Phone`] || "").trim()
    const relationship = row[`contact${n}Relationship`] || ""

    if (!name && !email && !phone) continue

    contacts.push({
      clientId: client.id,
      clientName: client.name,
      name: name || email || phone,
      relationship: normalizeRelationship(relationship),
      email,
      phone,
    })
  }

  return contacts
}
