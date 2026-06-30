import type { ComponentType } from "react"
import {
  CalendarDays,
  CheckSquare,
  Hash,
  ListChecks,
  Paperclip,
  Tag,
  Text,
  Type,
  UserRound,
} from "lucide-react"

export type CustomFieldKind =
  | "text"
  | "long-text"
  | "number"
  | "date"
  | "select"
  | "multi-select"
  | "boolean"
  | "attachment"
  | "member"

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

export interface CustomFieldTypeDef {
  kind: CustomFieldKind
  label: string
  icon: IconType
  description: string
  /** Sample value shown in the hover preview. */
  previewValue: string
  /** Optional preview chip styling (status/category fields). */
  previewChip?: boolean
}

export const CUSTOM_FIELD_TYPES: CustomFieldTypeDef[] = [
  {
    kind: "text",
    label: "Text",
    icon: Type,
    description: "Short text for names, labels, or notes.",
    previewValue: "Follow up next week",
  },
  {
    kind: "long-text",
    label: "Long text",
    icon: Text,
    description: "Multi-line notes or longer descriptions.",
    previewValue: "Participant prefers morning sessions…",
  },
  {
    kind: "number",
    label: "Number",
    icon: Hash,
    description: "Numeric values — counts, hours, or amounts.",
    previewValue: "$190.91",
  },
  {
    kind: "date",
    label: "Date",
    icon: CalendarDays,
    description: "Pick a date for deadlines, reviews, or milestones.",
    previewValue: "12 Jun 2026",
  },
  {
    kind: "select",
    label: "Select",
    icon: Tag,
    description: "Single choice from a list of options.",
    previewValue: "In progress",
    previewChip: true,
  },
  {
    kind: "multi-select",
    label: "Multi-select",
    icon: ListChecks,
    description: "Choose one or more tags or categories.",
    previewValue: "Priority · Review",
    previewChip: true,
  },
  {
    kind: "boolean",
    label: "Yes / No",
    icon: CheckSquare,
    description: "A simple yes or no toggle.",
    previewValue: "Yes",
    previewChip: true,
  },
  {
    kind: "attachment",
    label: "Attachment",
    icon: Paperclip,
    description: "Upload files or documents to a row.",
    previewValue: "care-plan.pdf",
  },
  {
    kind: "member",
    label: "Member",
    icon: UserRound,
    description: "Assign a team member to this row.",
    previewValue: "Alex Morgan",
  },
]

export const CUSTOM_FIELD_DEFAULT_LABEL: Record<CustomFieldKind, string> = {
  text: "Text",
  "long-text": "Notes",
  number: "Number",
  date: "Date",
  select: "Select",
  "multi-select": "Multi-select",
  boolean: "Yes / No",
  attachment: "Attachments",
  member: "Member",
}

export function getCustomFieldType(kind: CustomFieldKind): CustomFieldTypeDef | undefined {
  return CUSTOM_FIELD_TYPES.find((item) => item.kind === kind)
}
