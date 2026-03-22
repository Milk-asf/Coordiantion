export interface ParticipantDetails {
  firstName: string
  middleName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  gender: string
  pronouns: string
  ethnicity: string
  language: string
  primaryDiagnosis: string
  secondaryDiagnosis: string
  email: string
  mobile: string
  phone: string
  preferredContactMethod: string
  preferredSignMethod: string
  ndisNumber: string
  medicareNumber: string
  centrelinkNumber: string
  externalId: string
  serviceCommencementDate: string
  serviceExitDate: string
}

export const emptyParticipant: ParticipantDetails = {
  firstName: "", middleName: "", lastName: "", preferredName: "",
  dateOfBirth: "", gender: "", pronouns: "", ethnicity: "", language: "",
  primaryDiagnosis: "", secondaryDiagnosis: "",
  email: "", mobile: "", phone: "",
  preferredContactMethod: "", preferredSignMethod: "",
  ndisNumber: "", medicareNumber: "", centrelinkNumber: "", externalId: "",
  serviceCommencementDate: "", serviceExitDate: "",
}

export interface Client {
  id: string
  name: string
  iconColor: string
  iconText: string
  iconShape: "square" | "circle"
  participant: ParticipantDetails
  industry: string[]
  lastInteraction: string
  revenue: string
  headcount: string
  lastFunding: string
  website: string
  owner: string
  summary: string
  about: string
}

export interface Contact {
  id: string
  clientId: string | null
  clientName: string
  name: string
  relationship: string
  email: string
  phone: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
  assignee: string
  client: string
  clientId: string | null
  dueDate: string | null
  attachments: Attachment[]
  chargeType: string
  timeSpent: number
}

export interface Attachment {
  id: string
  name: string
  size: number
}

export interface Workspace {
  id: string
  name: string
  created_by: string | null
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string | null
  role: "super-admin" | "admin" | "support-worker"
  status: "active" | "pending" | "invited"
  invited_email: string | null
  created_at: string
  email?: string
  name?: string
}

export interface StaffDetails {
  firstName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  gender: string
  pronouns: string
  email: string
  mobile: string
  phone: string
  role: string
  department: string
  employmentType: string
  startDate: string
  endDate: string
  qualifications: string
  certifications: string
  emergencyContactName: string
  emergencyContactPhone: string
  notes: string
}

export const emptyStaffDetails: StaffDetails = {
  firstName: "", lastName: "", preferredName: "",
  dateOfBirth: "", gender: "", pronouns: "",
  email: "", mobile: "", phone: "",
  role: "", department: "", employmentType: "",
  startDate: "", endDate: "",
  qualifications: "", certifications: "",
  emergencyContactName: "", emergencyContactPhone: "",
  notes: "",
}

export interface StaffMember {
  id: string
  name: string
  iconText: string
  details: StaffDetails
  status: "active" | "invited" | "inactive"
  invitedEmail: string
}

export const relationshipConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  "support-coordinator": { label: "Support Coordinator", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "general-practitioner": { label: "General Practitioner", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "pharmacy": { label: "Pharmacy", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "mental-health": { label: "Mental Health", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "physiotherapist": { label: "Physiotherapist", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "decision-maker-opg": { label: "Decision Maker/OPG", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "public-trustee": { label: "Public Trustee", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "next-of-kin": { label: "Next of Kin", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "consumables": { label: "Consumables", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "cas-provider": { label: "CAS Provider", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "sil-provider": { label: "SIL Provider", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
}
