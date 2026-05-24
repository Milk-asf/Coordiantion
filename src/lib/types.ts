export type FundingType = "plan-managed" | "ndia-managed" | "self-managed" | ""

export interface FundingReleasePeriod {
  period: number
  amount: number
}

export interface PlanService {
  id: string
  name: string
  category: "support-coordination" | "psychosocial-recovery" | "travel"
  budget: number
  enabledChargeItems: string[]
  releasePeriods: FundingReleasePeriod[]
}

export type BudgetPeriod = "per-week" | "per-fortnight" | "per-month" | "per-year" | "per-plan"

export interface BudgetLineItem {
  id: string
  chargeItemNumber: string
  billingCode: string
  serviceName: string
  quantity: number
  unit: "hour" | "each" | "km"
  period: BudgetPeriod
  description: string
}

export interface Budget {
  id: string
  name: string
  startDate: string
  endDate: string
  chargeItems: string[]
  lineItems: BudgetLineItem[]
  createdAt: string
}

export interface NdisPlan {
  id: string
  startDate: string
  endDate: string
  isPacePlan: boolean
  supportCoordinationBudget?: number
  services?: PlanService[]
  documentPath?: string
  documentName?: string
  documentUrl?: string
  createdAt: string
}

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
  checkInPeriod: string
  fundingType: FundingType
  planManagerName: string
  planManagerEmail: string
  planManagerOrg: string
  planStartDate: string
  planEndDate: string
  plans?: NdisPlan[]
  budgets?: Budget[]
  supportCoordinationBudget?: number
  supportCoordinationUsed?: number
  description?: string
  activityLog?: ActivityEntry[]
}

export interface ActivityEntry {
  id: string
  type: "plan_created" | "plan_updated" | "service_added" | "service_updated" | "service_deleted" | "budget_created" | "budget_updated" | "budget_deleted" | "field_updated" | "description_updated" | "account_created"
  message: string
  user: string
  createdAt: string
}

export const emptyParticipant: ParticipantDetails = {
  firstName: "", middleName: "", lastName: "", preferredName: "",
  dateOfBirth: "", gender: "", pronouns: "", ethnicity: "", language: "",
  primaryDiagnosis: "", secondaryDiagnosis: "",
  email: "", mobile: "", phone: "",
  preferredContactMethod: "", preferredSignMethod: "",
  ndisNumber: "", medicareNumber: "", centrelinkNumber: "", externalId: "",
  serviceCommencementDate: "", serviceExitDate: "",
  checkInPeriod: "",
  fundingType: "", planManagerName: "", planManagerEmail: "", planManagerOrg: "",
  planStartDate: "", planEndDate: "",
}

export interface Client {
  id: string
  name: string
  displayName: string
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
  assignedTo: string | null
  summary: string
  about: string
  status: "active" | "archived"
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
  secondaryChargeType: string
  secondaryTimeSpent: number
  isCheckUp?: boolean
}

export interface Attachment {
  id: string
  name: string
  size: number
  storagePath?: string
  url?: string
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
  role: "super-admin" | "admin" | "coordinator"
  status: "active" | "pending" | "invited" | "deactivated"
  invited_email: string | null
  team: string | null
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

export interface Document {
  id: string
  workspaceId: string
  name: string
  size: number
  mimeType: string
  storagePath: string
  folder: string
  uploadedBy: string | null
  createdAt: string
}

export type InvoiceStatus = "unsent" | "sent" | "paid" | "overdue"
export type InvoiceDeliveryMethod = "plan-manager-email" | "participant-email" | "ndia-portal"

export interface InvoiceLineItem {
  id: string
  description: string
  chargeItemNumber: string
  chargeName: string
  quantity: number
  unit: "hour" | "each" | "km"
  rate: number
  amount: number
  taskId?: string
  clientId?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  clientName: string
  clientId: string | null
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  taskIds: string[]
  lineItems: InvoiceLineItem[]
  subtotal: number
  gst: number
  total: number
  notes: string
  createdBy: string
  createdAt: string
  paidAt?: string
  sentAt?: string
  sentTo?: string
  sentError?: string
  deliveryMethod?: InvoiceDeliveryMethod
}

export interface Note {
  id: string
  workspaceId: string
  title: string
  content: string
  clientId: string | null
  clientName: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceEmailSettings {
  orgName: string
  orgAbn: string
  ndisNumber: string
  orgPhone: string
  orgEmail: string
  orgAddress: string
  replyToEmail: string
  emailFooter: string
  bankName: string
  bankBsb: string
  bankAccountNumber: string
  bankAccountName: string
  logoUrl: string
  primaryColor: string
}

export const relationshipConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  "plan-manager": { label: "Plan Manager", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
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
