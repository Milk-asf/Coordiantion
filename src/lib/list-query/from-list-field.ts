import type { ListField } from "@/lib/lists/definitions"
import type { QueryField } from "@/lib/list-query/types"

export function queryFieldFromListField(field: ListField): QueryField {
  return {
    key: field.key,
    label: field.label,
    kind: field.kind,
    format: field.format,
    get: field.get,
    filterable: field.kind === "category" || field.kind === "boolean",
    sortable: true,
    searchable: true,
  }
}

export function queryFieldsFromListFields(fields: ListField[]): QueryField[] {
  return fields.map(queryFieldFromListField)
}
