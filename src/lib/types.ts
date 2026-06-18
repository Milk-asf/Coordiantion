export type FundingType = "plan-managed" | "ndia-managed" | "self-managed" | ""

export type BudgetPeriod = "per-week" | "per-fortnight" | "per-month" | "per-year" | "per-plan"

export type FundingReleaseCadence = "monthly" | "quarterly" | "semi-annual" | "annual" | "upfront"

export type NdisFundingComponent = "core" | "capacity-building" | "capital"

export interface BudgetReleasePeriod {
  id: string
  periodNumber: number
  startDate: string
  endDate: string
  allocatedAmount: number
}

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
  /** NDIS funding pool id from ndis-funding-pools */
  fundingPoolId?: string
  supportCategoryNumber?: number
  supportCategoryLabel?: string
  fundingComponent?: NdisFundingComponent
  /** Total plan allocation for this budget / pool line */
  allocatedAmount?: number
  releaseCadence?: FundingReleaseCadence
  releasePeriods?: BudgetReleasePeriod[]
  chargeItems: string[]
  lineItems: BudgetLineItem[]
  createdAt: string
}

export interface SpendingPlan {
  id: string
  name: string
  /** Optional link to a funding pool budget */
  budgetId?: string
  chargeItemNumber: string
  serviceName: string
  quantity: number
  unit: "hour" | "each" | "km"
  cadence: BudgetPeriod
  startDate: string
  endDate: string
  description: string
  createdAt: string
}

export type GoalType = "long-term" | "short-term"
export type GoalStatus = "not-started" | "in-progress" | "achieved" | "on-hold"

export interface GoalLinkedTask {
  taskId: string
  title: string
  status: "todo" | "in-progress" | "done"
  linkedAt: string
}

export interface GoalLinkedShift {
  shiftId: string
  title: string
  date: string
  startTime: string
  endTime: string
  status: "scheduled" | "completed" | "cancelled"
  linkedAt: string
}

export interface ClientGoal {
  id: string
  title: string
  goalType: GoalType
  status: GoalStatus
  achievementStrategies: string
  barriers: string
  linkedTasks: GoalLinkedTask[]
  linkedShifts?: GoalLinkedShift[]
  createdAt: string
}

export interface CarePlan {
  id: string
  workspaceId: string
  clientId: string
  documentId: string
  createdDate: string
  renewalDate: string
  createdAt: string
  updatedAt: string
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
  address: string
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
  checkInStartDate: string
  fundingType: FundingType
  planManagerName: string
  planManagerEmail: string
  planManagerPhone?: string
  planManagerOrg: string
  planStartDate: string
  planEndDate: string
  budgets?: Budget[]
  spendingPlans?: SpendingPlan[]
  goals?: ClientGoal[]
  description?: string
  activityLog?: ActivityEntry[]
}

export interface ActivityEntry {
  id: string
  type: "plan_created" | "plan_updated" | "service_added" | "service_updated" | "service_deleted" | "budget_created" | "budget_updated" | "budget_deleted" | "spending_plan_created" | "spending_plan_updated" | "spending_plan_deleted" | "goal_created" | "goal_updated" | "goal_deleted" | "field_updated" | "description_updated" | "account_created"
  message: string
  user: string
  createdAt: string
}

export const emptyParticipant: ParticipantDetails = {
  firstName: "", middleName: "", lastName: "", preferredName: "",
  dateOfBirth: "", gender: "", pronouns: "", ethnicity: "", language: "",
  primaryDiagnosis: "", secondaryDiagnosis: "", address: "",
  email: "", mobile: "", phone: "",
  preferredContactMethod: "", preferredSignMethod: "",
  ndisNumber: "", medicareNumber: "", centrelinkNumber: "", externalId: "",
  serviceCommencementDate: "", serviceExitDate: "",
  checkInPeriod: "", checkInStartDate: "",
  fundingType: "", planManagerName: "", planManagerEmail: "", planManagerPhone: "", planManagerOrg: "",
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
  address: string
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
  dateOfBirth: "", gender: "", pronouns: "", address: "",
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
  validFrom: string | null
  validTo: string | null
  createdAt: string
}

export type InvoiceStatus = "unsent" | "sent" | "paid" | "overdue" | "void"
export type InvoiceKind = "invoice" | "credit-note"
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
  serviceDate?: string
  gstCode?: string
  gstAmount?: number
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
  kind?: InvoiceKind
  creditOf?: string
  voidedAt?: string
  pdfPath?: string
  sentMessageId?: string
}

export type OrderStatus = "draft" | "sent" | "returned" | "approved"
export type OrderFundingSource = "none" | "ndis" | "private" | "other"

export interface Order {
  id: string
  workspaceId: string
  clientId: string | null
  clientName: string
  title: string
  amount: number
  fundingSource: OrderFundingSource
  description: string
  attachmentName: string
  attachmentStoragePath: string
  attachmentMimeType: string
  attachmentSize: number
  status: OrderStatus
  createdBy: string | null
  createdByName: string
  approvedBy: string | null
  approvedByName: string
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  workspaceId: string
  title: string
  content: string
  clientId: string | null
  clientName: string
  staffId: string | null
  attachments: Attachment[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type IncidentStatus = "confirmed" | "alleged"

export type IncidentInvestigationStatus = "not_started" | "in_progress" | "completed"

export interface Incident {
  id: string
  workspaceId: string
  completedByStaffId: string | null
  completedByName: string
  reportedByStaffId: string | null
  reportedByName: string
  clientIds: string[]
  clientNames: string
  workerIds: string[]
  workerNames: string
  incidentDate: string
  incidentStartTime: string
  incidentEndTime: string
  location: string
  otherParties: string
  category: string
  incidentStatus: IncidentStatus
  isReportable: boolean
  ndisReportableCategory: string | null
  description: string
  witnessDetails: string
  impactDetails: string
  actionsTaken: string
  emergencyServicesContacted: "no" | "yes"
  organisationNotified: boolean
  attachments: Attachment[]
  createdBy: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
  investigationStatus: IncidentInvestigationStatus
  investigatedByStaffId: string | null
  investigatedByName: string
  investigationSummary: string
  investigationRootCause: string
  investigationCorrectiveActions: string
  investigationPreventativeActions: string
  investigationCompletedAt: string | null
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
  "plan-manager": { label: "Plan Manager", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "support-coordinator": { label: "Support Coordinator", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "general-practitioner": { label: "General Practitioner", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "pharmacy": { label: "Pharmacy", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "mental-health": { label: "Mental Health", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "physiotherapist": { label: "Physiotherapist", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "decision-maker-opg": { label: "Decision Maker/OPG", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "public-trustee": { label: "Public Trustee", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "next-of-kin": { label: "Next of Kin", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "consumables": { label: "Consumables", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "cas-provider": { label: "CAS Provider", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "sil-provider": { label: "SIL Provider", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
  "other": { label: "Other", bg: "bg-transparent", text: "text-folk-text", border: "border-folk-border" },
}
