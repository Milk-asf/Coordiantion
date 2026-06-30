import type { Contact } from "@/lib/types"
import { relationshipConfig } from "@/lib/types"
import type { QueryField } from "@/lib/list-query/types"

export const CONTACT_QUERY_FIELDS: QueryField[] = [
  {
    key: "name",
    label: "Name",
    kind: "text",
    get: (record) => (record as Contact).name,
    filterable: false,
    sortable: true,
    searchable: true,
  },
  {
    key: "client",
    label: "Client",
    kind: "category",
    get: (record) => (record as Contact).clientName,
    sortable: true,
    searchable: true,
  },
  {
    key: "relationship",
    label: "Relationship",
    kind: "category",
    get: (record) => {
      const key = (record as Contact).relationship
      return relationshipConfig[key]?.label ?? key
    },
    sortable: true,
    searchable: true,
  },
  {
    key: "email",
    label: "Email",
    kind: "text",
    get: (record) => (record as Contact).email,
    filterable: false,
    sortable: true,
    searchable: true,
  },
  {
    key: "phone",
    label: "Phone number",
    kind: "text",
    get: (record) => (record as Contact).phone,
    filterable: false,
    sortable: true,
    searchable: true,
  },
]

/** Match filters using raw relationship keys while displaying labels in the UI. */
export function matchContactFilter(
  field: QueryField,
  record: unknown,
  values: string[],
): boolean {
  const contact = record as Contact
  if (field.key === "relationship") {
    return values.includes(contact.relationship)
  }
  if (field.key === "client") {
    return values.includes(contact.clientName)
  }
  return values.includes(String(field.get(record) ?? ""))
}
