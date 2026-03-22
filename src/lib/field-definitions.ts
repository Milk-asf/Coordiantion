export type FieldType =
  | "text"
  | "date"
  | "markdown"
  | "single-select"
  | "multi-select"
  | "url"
  | "number"
  | "address"
  | "phone"
  | "email"

export type EditableBy = "system" | "anyone"
export type EntityTab = "participants" | "contacts" | "staff"

export interface FieldDefinition {
  id: string
  name: string
  type: FieldType
  description: string
  editableBy: EditableBy
  isSystem: boolean
  isEnabled: boolean
  isCustom: boolean
  entity: EntityTab
}

export const fieldTypeLabels: Record<FieldType, string> = {
  text: "Text",
  date: "Date",
  markdown: "Markdown",
  "single-select": "Single select",
  "multi-select": "Multi select",
  url: "URL",
  number: "Number",
  address: "Address",
  phone: "Phone",
  email: "Email",
}

export const entityTabLabels: Record<EntityTab, string> = {
  participants: "Participants",
  contacts: "Contacts",
  staff: "Staff",
}

export const FIELD_CONFIG_STORAGE_KEY = "data-model-fields"

export const defaultParticipantFields: FieldDefinition[] = [
  { id: "p-record-id", name: "Record ID", type: "text", description: "Unique participant identifier", editableBy: "system", isSystem: true, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-created-at", name: "Created at", type: "date", description: "Date the record was created", editableBy: "system", isSystem: true, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-name", name: "Name", type: "text", description: "Participant full name", editableBy: "anyone", isSystem: true, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-first-name", name: "First name", type: "text", description: "Participant first name", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-middle-name", name: "Middle name", type: "text", description: "Participant middle name", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-last-name", name: "Last name", type: "text", description: "Participant last name", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-preferred-name", name: "Preferred name", type: "text", description: "Name the participant prefers to be called", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-date-of-birth", name: "Date of birth", type: "date", description: "Participant date of birth", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-gender", name: "Gender", type: "single-select", description: "Participant gender identity", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-pronouns", name: "Pronouns", type: "single-select", description: "Preferred pronouns", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-ethnicity", name: "Ethnicity", type: "text", description: "Cultural or ethnic background", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-language", name: "Language", type: "text", description: "Primary language spoken", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-primary-diagnosis", name: "Primary diagnosis", type: "text", description: "Primary medical or disability diagnosis", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-secondary-diagnosis", name: "Secondary diagnosis", type: "text", description: "Secondary or co-occurring diagnosis", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-email", name: "Email", type: "email", description: "Participant email address", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-mobile", name: "Mobile", type: "phone", description: "Mobile phone number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-phone", name: "Phone", type: "phone", description: "Landline or secondary phone number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-contact-method", name: "Contact method", type: "single-select", description: "Preferred method of contact", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-sign-method", name: "Sign method", type: "single-select", description: "Preferred signing method for documents", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-ndis-number", name: "NDIS number", type: "text", description: "National Disability Insurance Scheme participant number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-medicare-number", name: "Medicare number", type: "text", description: "Medicare card number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-centrelink-number", name: "Centrelink number", type: "text", description: "Centrelink reference number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-external-id", name: "External ID", type: "text", description: "ID from an external system", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-service-start", name: "Service start date", type: "date", description: "Date services commenced", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-service-exit", name: "Service exit date", type: "date", description: "Date services ended or are expected to end", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-owner", name: "Owner", type: "text", description: "Staff member responsible for this participant", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-summary", name: "Summary", type: "markdown", description: "Brief overview of the participant", editableBy: "system", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
  { id: "p-about", name: "About", type: "markdown", description: "Detailed participant background and context", editableBy: "system", isSystem: false, isEnabled: true, isCustom: false, entity: "participants" },
]

export const defaultContactFields: FieldDefinition[] = [
  { id: "c-record-id", name: "Record ID", type: "text", description: "Unique contact identifier", editableBy: "system", isSystem: true, isEnabled: true, isCustom: false, entity: "contacts" },
  { id: "c-created-at", name: "Created at", type: "date", description: "Date the record was created", editableBy: "system", isSystem: true, isEnabled: true, isCustom: false, entity: "contacts" },
  { id: "c-name", name: "Name", type: "text", description: "Contact full name", editableBy: "anyone", isSystem: true, isEnabled: true, isCustom: false, entity: "contacts" },
  { id: "c-participant", name: "Participant", type: "text", description: "Associated participant", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "contacts" },
  { id: "c-relationship", name: "Relationship", type: "single-select", description: "Relationship to the participant", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "contacts" },
  { id: "c-email", name: "Email", type: "email", description: "Contact email address", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "contacts" },
  { id: "c-phone", name: "Phone", type: "phone", description: "Contact phone number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "contacts" },
]

export const defaultStaffFields: FieldDefinition[] = [
  { id: "s-record-id", name: "Record ID", type: "text", description: "Unique staff identifier", editableBy: "system", isSystem: true, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-created-at", name: "Created at", type: "date", description: "Date the record was created", editableBy: "system", isSystem: true, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-name", name: "Name", type: "text", description: "Staff member full name", editableBy: "anyone", isSystem: true, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-first-name", name: "First name", type: "text", description: "Staff first name", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-last-name", name: "Last name", type: "text", description: "Staff last name", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-preferred-name", name: "Preferred name", type: "text", description: "Preferred name", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-email", name: "Email", type: "email", description: "Work email address", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-mobile", name: "Mobile", type: "phone", description: "Mobile phone number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-phone", name: "Phone", type: "phone", description: "Work phone number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-role", name: "Role", type: "text", description: "Job role or title", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-department", name: "Department", type: "single-select", description: "Department or team", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-employment-type", name: "Employment type", type: "single-select", description: "Full-time, part-time, casual, etc.", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-start-date", name: "Start date", type: "date", description: "Employment start date", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-end-date", name: "End date", type: "date", description: "Employment end date", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-qualifications", name: "Qualifications", type: "text", description: "Academic and professional qualifications", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-certifications", name: "Certifications", type: "text", description: "Current certifications and clearances", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-emergency-contact", name: "Emergency contact", type: "text", description: "Emergency contact name", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-emergency-phone", name: "Emergency phone", type: "phone", description: "Emergency contact phone number", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
  { id: "s-notes", name: "Notes", type: "markdown", description: "Additional notes about the staff member", editableBy: "anyone", isSystem: false, isEnabled: true, isCustom: false, entity: "staff" },
]

export function getDefaultFields(): FieldDefinition[] {
  return [
    ...defaultParticipantFields,
    ...defaultContactFields,
    ...defaultStaffFields,
  ]
}

export const participantFieldToColumnKey: Record<string, string> = {
  "p-ndis-number": "ndisNumber",
  "p-primary-diagnosis": "diagnosis",
  "p-secondary-diagnosis": "diagnosis",
  "p-email": "email",
  "p-phone": "phone",
  "p-mobile": "mobile",
  "p-date-of-birth": "dob",
  "p-gender": "gender",
  "p-pronouns": "pronouns",
  "p-ethnicity": "ethnicity",
  "p-language": "language",
  "p-preferred-name": "preferredName",
  "p-medicare-number": "medicareNumber",
  "p-centrelink-number": "centrelinkNumber",
  "p-external-id": "externalId",
  "p-contact-method": "preferredContactMethod",
  "p-sign-method": "preferredSignMethod",
  "p-service-start": "serviceCommencementDate",
  "p-service-exit": "serviceExitDate",
}

export const contactFieldToColumnKey: Record<string, string> = {
  "c-participant": "client",
  "c-relationship": "relationship",
  "c-email": "email",
  "c-phone": "phone",
}

export const staffFieldToColumnKey: Record<string, string> = {
  "s-email": "email",
  "s-phone": "phone",
  "s-mobile": "mobile",
  "s-role": "role",
  "s-department": "department",
  "s-employment-type": "employmentType",
  "s-start-date": "startDate",
  "s-end-date": "endDate",
  "s-qualifications": "qualifications",
  "s-certifications": "certifications",
  "s-preferred-name": "preferredName",
  "s-emergency-contact": "emergencyContactName",
  "s-emergency-phone": "emergencyContactPhone",
  "s-date-of-birth": "dob",
  "s-gender": "gender",
  "s-pronouns": "pronouns",
}
